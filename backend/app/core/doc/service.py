from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .registry import DocRegistry
from .base import BaseDocument, DocumentStatus
from app.models import (User)

class DocService:
    """Service to manage all Document CRUD and their lifecycles."""
    
    def __init__(self, db: Session, tenant_id: int, user: Optional[User] = None):
        self.db = db
        self.tenant_id = tenant_id
        self.user = user
        from app.core.auth.rbac import PermissionManager
        self.permissions = PermissionManager(db, tenant_id)

    def get_list(self, doctype: str, filters: Dict[str, Any] = None, limit: int = 50, offset: int = 0, order_by: str = "id desc") -> List[Dict[str, Any]]:
        """List documents with filtering, pagination and sorting."""
        # RBAC Check
        if self.user and not self.permissions.check_permission(doctype, self.user.role, "read"):
             raise ValueError(f"No read permission for DocType '{doctype}'")

        model = self._get_model(doctype)
        if not model:
            raise ValueError(f"No database storage found for DocType '{doctype}'")
        
        query = self.db.query(model).filter_by(tenant_id=self.tenant_id)
        
        if filters:
             for key, val in filters.items():
                 if hasattr(model, key):
                     query = query.filter(getattr(model, key) == val)
        
        # Sorting logic (e.g. 'id desc')
        if order_by:
            parts = order_by.split(" ")
            field = parts[0]
            pk_col = model.__table__.primary_key.columns.keys()[0]
            
            if field == "id" and not hasattr(model, "id"):
                field = pk_col
                
            if hasattr(model, field):
                column = getattr(model, field)
                if len(parts) > 1 and parts[1].lower() == "desc":
                    query = query.order_by(column.desc())
                else:
                    query = query.order_by(column.asc())
            else:
                # Fallback to PK if the requested field doesn't exist
                query = query.order_by(getattr(model, pk_col).desc())

        results = query.offset(offset).limit(limit).all()
        return [self._to_doc(doctype, r).to_dict() for r in results]

    def get_doc(self, doctype: str, name: str) -> Optional[BaseDocument]:
        """Fetch a single document by its name (ID)."""
        # RBAC Check
        if self.user and not self.permissions.check_permission(doctype, self.user.role, "read"):
             raise ValueError(f"No read permission for DocType '{doctype}'")

        model = self._get_model(doctype)
        pk_col = model.__table__.primary_key.columns.keys()[0]
        record = self.db.query(model).filter(getattr(model, pk_col) == name, model.tenant_id == self.tenant_id).first()
        if not record:
             return None
        return self._to_doc(doctype, record)

    def create(self, doctype: str, data: Dict[str, Any]) -> BaseDocument:
        """Create a new document with full hooks."""
        # RBAC Check
        if self.user and not self.permissions.check_permission(doctype, self.user.role, "create"):
             raise ValueError(f"No create permission for DocType '{doctype}'")

        doc_class = DocRegistry.get_class(doctype)
        if not doc_class:
             raise ValueError(f"DocType '{doctype}' not registered.")
             
        doc = doc_class(data)
        
        # Hooks
        doc.before_insert()
        doc.before_save()
        
        # 1. Store to DB (Mapping to SQLAlchemy model)
        model = self._get_model(doctype)
        doc_dict = doc.to_dict() # Includes status
        
        kwargs = {"tenant_id": self.tenant_id}
        kwargs.update(doc_dict)
        
        valid_cols = set(model.__table__.columns.keys())
        pk_col = model.__table__.primary_key.columns.keys()[0]
        
        if pk_col in valid_cols and pk_col not in kwargs:
             kwargs[pk_col] = doc.name

        final_kwargs = {k: v for k, v in kwargs.items() if k in valid_cols}
        
        if 'custom_data' in valid_cols:
            custom = {k: v for k, v in kwargs.items() if k not in valid_cols and k != "id"}
            if custom:
                final_kwargs['custom_data'] = custom
                
        record = model(**final_kwargs)
        self.db.add(record)
        
        # Hooks
        doc.after_insert()
        doc.after_save()
        
        # Audit Log
        self._log_activity(doc, "Created")
        
        self.db.commit()
        return doc

    def submit(self, doctype: str, name: str):
        """Submit a document with lifecycle logic (on_submit hook)."""
        # RBAC Check
        if self.user and not self.permissions.check_permission(doctype, self.user.role, "submit"):
             raise ValueError(f"No submit permission for DocType '{doctype}'")

        doc = self.get_doc(doctype, name)
        if not doc:
            raise ValueError(f"Document '{name}' not found.")
            
        doc.on_submit(db=self.db, tenant_id=self.tenant_id) # Changes status to Submitted
        
        # Update DB
        self._save_to_db(doc)
        
        # Create Audit Log entry
        self._log_activity(doc, "Submitted")
        
        self.db.commit()
        return doc

    def update(self, doctype: str, name: str, data: Dict[str, Any]) -> BaseDocument:
        """Update an existing document."""
        # RBAC Check
        if self.user and not self.permissions.check_permission(doctype, self.user.role, "write"):
             raise ValueError(f"No write permission for DocType '{doctype}'")

        doc = self.get_doc(doctype, name)
        if not doc:
            raise ValueError(f"Document '{name}' not found.")
            
        # Update current doc fields
        for k, v in data.items():
            doc.set(k, v)
            
        doc.before_save()
        
        # 1. Update DB model
        model = self._get_model(doctype)
        pk_col = model.__table__.primary_key.columns.keys()[0]
        record = self.db.query(model).filter(getattr(model, pk_col) == name, model.tenant_id == self.tenant_id).first()
        
        if record:
            valid_cols = set(model.__table__.columns.keys())
            final_kwargs = {k: v for k, v in doc._data.items() if k in valid_cols}
            
            for k, v in final_kwargs.items():
                setattr(record, k, v)
                
            if 'custom_data' in valid_cols:
                custom = {k: v for k, v in doc._data.items() if k not in valid_cols and k != pk_col}
                if custom:
                    record.custom_data = custom
                    
        doc.after_save()
        self._log_activity(doc, "Updated")
        self.db.commit()
        return doc

    def delete(self, doctype: str, name: str):
        """Delete a document and log the action."""
        # RBAC Check
        if self.user and not self.permissions.check_permission(doctype, self.user.role, "delete"):
             raise ValueError(f"No delete permission for DocType '{doctype}'")

        doc = self.get_doc(doctype, name)
        if not doc:
            raise ValueError(f"Document '{name}' not found.")
            
        model = self._get_model(doctype)
        pk_col = model.__table__.primary_key.columns.keys()[0]
        record = self.db.query(model).filter(getattr(model, pk_col) == name, model.tenant_id == self.tenant_id).first()
        
        if record:
            self.db.delete(record)
            self._log_activity(doc, "Deleted")
            self.db.commit()
            return True
        return False

    def _log_activity(self, doc, action: str, changes: Dict = None):
        """Append an entry to the system audit trail."""
        from app.models import AuditLog
        log = AuditLog(
            doctype=doc.doctype,
            docname=doc.name,
            user_id=self.user.id if self.user else 0,
            action=action,
            changes=changes or {},
            tenant_id=self.tenant_id
        )
        self.db.add(log)

    def _get_model(self, doctype: str) -> Any:
        """Temporary mapper to existing SQLAlchemy models (from models.py)."""
        from app import models
        # Map our friendly names to the models exactly as defined in app/models.py
        mapping = {
            "Sales Invoice": getattr(models, "Invoice", None),
            "Quotation": getattr(models, "Quotation", None),
            "Customer": getattr(models, "Customer", None),
            "Lead": getattr(models, "Lead", None),
            "Product": getattr(models, "Product", None),
            "Employee": getattr(models, "Employee", None),
            "Warehouse": getattr(models, "Warehouse", None),
            "BOM": getattr(models, "BOM", None),
            "Supplier": getattr(models, "Supplier", None),
            "Purchase Order": getattr(models, "PurchaseOrder", None),
            "Purchase Receipt": getattr(models, "PurchaseReceipt", None),
            "Salary Slip": getattr(models, "SalarySlip", None),
            "Attendance": getattr(models, "Attendance", None),
            "Stock Entry": getattr(models, "StockEntry", None)
        }
        return mapping.get(doctype)

    def _to_doc(self, doctype: str, db_record: Any) -> BaseDocument:
        """Convert a DB record to a Document object."""
        doc_class = DocRegistry.get_class(doctype) or BaseDocument
        # Extract data from SQLAlchemy object
        data = {c.name: getattr(db_record, c.name) for c in db_record.__table__.columns}
        return doc_class(data)

    def _save_to_db(self, doc: BaseDocument):
        """Update the underlying SQLAlchemy model record with current document state."""
        model = self._get_model(doc.doctype)
        if not model:
             return
             
        pk_col = model.__table__.primary_key.columns.keys()[0]
        record = self.db.query(model).filter(
            getattr(model, pk_col) == doc.name, 
            model.tenant_id == self.tenant_id
        ).first()

        if record:
            doc_dict = doc.to_dict()
            valid_cols = set(model.__table__.columns.keys())
            
            # Map doc fields to columns
            for k, v in doc_dict.items():
                if k in valid_cols and k != pk_col:
                    setattr(record, k, v)
                    
            # Handle child items specifically if they exist in DB and doc
            if hasattr(record, "items") and "items" in doc_dict:
                # Basic sync: clear old and add new (inefficient but safe for demo)
                 pass # Child table support requires more specific logic per doctype
