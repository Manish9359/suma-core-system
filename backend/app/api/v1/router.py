from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.doc.service import DocService
from app.core.auth.security import get_current_user # consolidated helper
from app.models import User

from .auth import router as auth_router
from .reports import router as reports_router

router = APIRouter()

# Include Sub-Routers
router.include_router(auth_router, prefix="/auth")
router.include_router(reports_router, prefix="/reports")

# Generic Doc Router (Prefix set to /doc)
doc_router = APIRouter(prefix="/doc", tags=["Documents"])

def get_service(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DocService:
    """Dependency for providing the DocService with current user/tenant context."""
    return DocService(db, tenant_id=user.tenant_id, user=user)

@doc_router.get("/meta/{doctype}")
def get_doctype_meta(doctype: str, db: Session = Depends(get_db)):
    """Fetch the schema (metadata) for a given DocType. This defines how the frontend should render the form."""
    from app.core.doc.registry import DocRegistry
    from app.models import CustomField
    
    # 1. Fetch Formal Metadata
    raw_meta = DocRegistry.get_metadata(doctype)
    if not raw_meta:
         raise HTTPException(404, f"DocType {doctype} not found in registry")
         
    res_dict = raw_meta.dict()
    
    # 2. Merge Custom Fields (Multi-tenant)
    # Note: In a real system, we'd extract tenant_id from user header
    tenant_id = 1 
    custom_fields = db.query(CustomField).filter_by(module=doctype, tenant_id=tenant_id).all()
    for cf in custom_fields:
        res_dict["fields"].append({
            "name": cf.fieldname,
            "label": cf.label,
            "type": cf.fieldtype.lower(),
            "required": False,
            "is_custom": True
        })
        
    return res_dict

@doc_router.post("/meta/custom-field")
def create_custom_field(data: Dict[str, Any], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Add a new custom field to a DocType (Admin only)."""
    from app.models import CustomField
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    
    cf = CustomField(
        module=data["doctype"],
        fieldname=data["name"],
        label=data.get("label", data["name"]),
        fieldtype=data.get("type", "Data"),
        tenant_id=user.tenant_id
    )
    db.add(cf)
    db.commit()
    return {"status": "success", "message": f"Custom field {cf.fieldname} added to {cf.module}"}

@doc_router.get("/{doctype}")
def list_documents(
    doctype: str, 
    service: DocService = Depends(get_service),
    limit: int = 50,
    offset: int = 0,
    order_by: str = "id desc"
):
    """List all documents with pagination and sorting."""
    try:
        return service.get_list(doctype, limit=limit, offset=offset, order_by=order_by)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.get("/{doctype}/{docname}")
def get_document(doctype: str, docname: str, service: DocService = Depends(get_service)):
    """Fetch a single document by name (unique ID)."""
    doc = service.get_doc(doctype, docname)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{docname}' not found.")
    return doc.to_dict()

@doc_router.post("/{doctype}")
def create_document(doctype: str, data: Dict[str, Any], service: DocService = Depends(get_service)):
    """Create a new document of the specified DocType."""
    doc = service.create(doctype, data)
    return doc.to_dict()

@doc_router.post("/{doctype}/{docname}/submit")
def submit_document(doctype: str, docname: str, service: DocService = Depends(get_service)):
    """Submit a draft document (State Transition: Draft -> Submitted)."""
    try:
        doc = service.submit(doctype, docname)
        return {"status": "success", "doc": doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.post("/{doctype}/{docname}/convert")
def convert_document(doctype: str, docname: str, target: str, service: DocService = Depends(get_service)):
    """Convert an existing document to a new one (e.g., Opportunity -> Quotation)."""
    try:
        new_doc = service.convert_to(doctype, docname, target)
        return {"status": "success", "doc": new_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.put("/{doctype}/{docname}")
def update_document(doctype: str, docname: str, data: Dict[str, Any], service: DocService = Depends(get_service)):
    """Update an existing document."""
    try:
        doc = service.update(doctype, docname, data)
        return doc.to_dict()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.delete("/{doctype}/{docname}")
def delete_document(doctype: str, docname: str, service: DocService = Depends(get_service)):
    """Delete an existing document."""
    try:
        service.delete(doctype, docname)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
@doc_router.get("/{doctype}/{docname}/activity")
def get_document_activity(doctype: str, docname: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Fetch the history and audit logs for a specific document."""
    from app.models import AuditLog
    logs = db.query(AuditLog).filter_by(
        doctype=doctype, 
        docname=docname, 
        tenant_id=user.tenant_id
    ).order_by(AuditLog.timestamp.desc()).all()
    return logs

router.include_router(doc_router)
