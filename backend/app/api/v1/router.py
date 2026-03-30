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
    
    # Check if we have explicit metadata
    meta = DocRegistry.get_metadata(doctype)
    if meta:
        return meta.dict()
        
    # If no explicit metadata, try to auto-generate a generic schema from the DB Model
    from app.core.doc.service import DocService
    service = DocService(db, tenant_id=1) # Temporary dummy tenant for schema reflection
    model = service._get_model(doctype)
    
    if not model:
        raise HTTPException(status_code=404, detail=f"No metadata or model found for '{doctype}'")
        
    # Auto-generate schema from SQLAlchemy model columns
    fields = []
    for col in model.__table__.columns:
        field_type = "text"
        if str(col.type) == "INTEGER": field_type = "number"
        elif "DATE" in str(col.type): field_type = "date"
        elif "FLOAT" in str(col.type) or "NUMERIC" in str(col.type): field_type = "number"
        
        fields.append({
            "name": col.name,
            "label": col.name.replace("_", " ").title(),
            "type": field_type,
            "required": not col.nullable and col.name != "id",
            "disabled": col.name in ["id", "tenant_id", "created_at", "updated_at"]
        })
        
    return {
        "name": doctype,
        "module": "Core",
        "fields": fields
    }

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

router.include_router(doc_router)

# Future Hooks will be implemented here (cancel, duplicate, etc.)
