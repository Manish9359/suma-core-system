from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.doc.service import DocService
from app.core.auth.security import get_current_user
from app.models import User

from .auth import router as auth_router
from .reports import router as reports_router

router = APIRouter()

# Include Sub-Routers
router.include_router(auth_router, prefix="/auth")
router.include_router(reports_router, prefix="/reports")

# ─── System Endpoints ───
system_router = APIRouter(prefix="/system", tags=["System"])

@system_router.get("/notifications")
def get_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models import Notification
    return db.query(Notification).filter_by(user_id=user.id, tenant_id=user.tenant_id).order_by(Notification.id.desc()).limit(20).all()

@system_router.get("/users")
def get_users(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "Admin":
        raise HTTPException(403, "Admin only")
    users = db.query(User).filter_by(tenant_id=user.tenant_id).all()
    return [{"id": u.id, "username": u.username, "role": u.role, "status": u.status} for u in users]

@system_router.post("/users")
def create_user(data: Dict[str, Any], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "Admin":
        raise HTTPException(403, "Admin only")
    from app.core.auth.security import hash_password
    new_user = User(
        username=data["username"],
        password=hash_password(data["password"]),
        role=data.get("role", "Employee"),
        tenant_id=user.tenant_id
    )
    db.add(new_user)
    db.commit()
    return {"id": new_user.id, "username": new_user.username, "role": new_user.role}

@system_router.get("/roles")
def get_roles(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models import Role
    roles = db.query(Role).filter_by(tenant_id=user.tenant_id).all()
    return [{"id": r.id, "name": r.name} for r in roles]

@system_router.post("/seed-demo-data")
def seed_demo_data(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "Admin":
        raise HTTPException(403, "Admin only")
    try:
        from seed_demo_data import seed_data
        seed_data()
        return {"status": "success", "message": "Demo data seeded successfully"}
    except Exception as e:
        raise HTTPException(500, f"Seeding failed: {str(e)}")

@system_router.post("/clear-demo-data")
def clear_demo_data(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "Admin":
        raise HTTPException(403, "Admin only")
    try:
        from app.models import (
            Customer, Lead, Product, Supplier, Employee, Invoice, InvoiceItem,
            Quotation, QuotationItem, SalesOrder, SalesOrderItem,
            PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseReceiptItem,
            PurchaseInvoiceModel, Opportunity, Project, Task, Issue,
            AMC, Installation, PaymentEntry, Attendance, SalarySlip,
            BOM, BOMItem, GLEntry, StockLedgerEntry, StockLedger, Bin, Timesheet
        )
        tables = [
            InvoiceItem, GLEntry, StockLedgerEntry, StockLedger, Bin,
            QuotationItem, SalesOrderItem, PurchaseOrderItem, PurchaseReceiptItem,
            Invoice, Quotation, SalesOrder, PurchaseOrder, PurchaseReceipt,
            PurchaseInvoiceModel, PaymentEntry, Attendance, SalarySlip,
            BOMItem, BOM, Task, Issue, AMC, Installation, Project,
            Opportunity, Lead, Customer, Supplier, Employee, Product
        ]
        for tbl in tables:
            try:
                db.query(tbl).filter_by(tenant_id=user.tenant_id).delete()
            except Exception:
                pass
        db.commit()
        return {"status": "success", "message": "Demo data cleared"}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Clear failed: {str(e)}")

router.include_router(system_router)

# ─── Engine / Stock Balance Endpoints ───
engine_router = APIRouter(prefix="/engine", tags=["Engine"])

@engine_router.get("/stock_balance/{item_code}")
def get_stock_balance(item_code: str, warehouse: str = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get real-time stock balance for an item, optionally by warehouse."""
    from app.models import Product, Bin
    from sqlalchemy import func
    
    product = db.query(Product).filter_by(sku=item_code, tenant_id=user.tenant_id).first()
    if not product:
        raise HTTPException(404, f"Product '{item_code}' not found")
    
    # Get bin-level stock
    query = db.query(Bin).filter_by(item_code=item_code, tenant_id=user.tenant_id)
    if warehouse:
        query = query.filter_by(warehouse=warehouse)
    bins = query.all()
    
    total_qty = sum(b.actual_qty for b in bins) if bins else product.stock
    
    return {
        "item_code": item_code,
        "item_name": product.name,
        "total_qty": total_qty,
        "warehouse_stock": [
            {"warehouse": b.warehouse, "actual_qty": b.actual_qty, "reserved_qty": b.reserved_qty, "projected_qty": b.projected_qty}
            for b in bins
        ],
        "valuation_rate": product.cost,
        "stock_value": total_qty * product.cost,
        "is_low": product.low or total_qty < 10
    }

@engine_router.get("/stock_balance_all")
def get_all_stock_balances(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get stock balances for all products."""
    from app.models import Product
    products = db.query(Product).filter_by(tenant_id=user.tenant_id).all()
    return [
        {
            "item_code": p.sku,
            "item_name": p.name,
            "qty": p.stock,
            "warehouse": p.warehouse or "Main",
            "is_low": p.low or p.stock < 10
        }
        for p in products
    ]

router.include_router(engine_router)

# ─── Generic Doc Router ───
doc_router = APIRouter(prefix="/doc", tags=["Documents"])

def get_service(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DocService:
    return DocService(db, tenant_id=user.tenant_id, user=user)

@doc_router.get("/meta/{doctype}")
def get_doctype_meta(doctype: str, db: Session = Depends(get_db)):
    from app.core.doc.registry import DocRegistry
    from app.models import CustomField
    
    raw_meta = DocRegistry.get_metadata(doctype)
    if not raw_meta:
        raise HTTPException(404, f"DocType '{doctype}' not found in registry")
    
    res_dict = raw_meta.dict()
    
    tenant_id = 1
    try:
        custom_fields = db.query(CustomField).filter_by(module=doctype, tenant_id=tenant_id).all()
        for cf in custom_fields:
            res_dict["fields"].append({
                "name": cf.fieldname,
                "label": cf.label,
                "fieldtype": cf.fieldtype.lower(),
                "required": False,
                "is_custom": True
            })
    except Exception:
        pass
    
    return res_dict

@doc_router.post("/meta/custom-field")
def create_custom_field(data: Dict[str, Any], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models import CustomField
    if user.role != "Admin":
        raise HTTPException(403, "Admins only")
    cf = CustomField(
        module=data["doctype"],
        fieldname=data["name"],
        label=data.get("label", data["name"]),
        fieldtype=data.get("type", "Data"),
        tenant_id=user.tenant_id
    )
    db.add(cf)
    db.commit()
    return {"status": "success"}

@doc_router.get("/{doctype}")
def list_documents(doctype: str, service: DocService = Depends(get_service), limit: int = 100, offset: int = 0, order_by: str = "id desc"):
    try:
        return service.get_list(doctype, limit=limit, offset=offset, order_by=order_by)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.get("/{doctype}/{docname}")
def get_document(doctype: str, docname: str, service: DocService = Depends(get_service)):
    doc = service.get_doc(doctype, docname)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{docname}' not found.")
    return doc.to_dict()

@doc_router.post("/{doctype}")
def create_document(doctype: str, data: Dict[str, Any], service: DocService = Depends(get_service)):
    try:
        doc = service.create(doctype, data)
        return doc.to_dict()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.post("/{doctype}/{docname}/submit")
def submit_document(doctype: str, docname: str, service: DocService = Depends(get_service)):
    try:
        doc = service.submit(doctype, docname)
        return {"status": "success", "doc": doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.post("/{doctype}/{docname}/cancel")
def cancel_document(doctype: str, docname: str, service: DocService = Depends(get_service)):
    try:
        doc = service.cancel(doctype, docname)
        return {"status": "success", "doc": doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.post("/{doctype}/{docname}/amend")
def amend_document(doctype: str, docname: str, service: DocService = Depends(get_service)):
    try:
        doc = service.amend(doctype, docname)
        return {"status": "success", "doc": doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.post("/{doctype}/{docname}/convert")
def convert_document(doctype: str, docname: str, target: str = "", service: DocService = Depends(get_service)):
    try:
        new_doc = service.convert_to(doctype, docname, target)
        return {"status": "success", "doc": new_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.put("/{doctype}/{docname}")
def update_document(doctype: str, docname: str, data: Dict[str, Any], service: DocService = Depends(get_service)):
    try:
        doc = service.update(doctype, docname, data)
        return doc.to_dict()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.delete("/{doctype}/{docname}")
def delete_document(doctype: str, docname: str, service: DocService = Depends(get_service)):
    try:
        service.delete(doctype, docname)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@doc_router.get("/{doctype}/{docname}/activity")
def get_document_activity(doctype: str, docname: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models import AuditLog
    logs = db.query(AuditLog).filter_by(
        doctype=doctype, docname=docname, tenant_id=user.tenant_id
    ).order_by(AuditLog.timestamp.desc()).all()
    return [
        {"action": l.action, "user_id": l.user_id, "timestamp": l.timestamp.isoformat() if l.timestamp else "", "changes": l.changes}
        for l in logs
    ]

router.include_router(doc_router)
