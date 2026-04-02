from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid
from sqlalchemy.orm import Session

class DocumentStatus(str, Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    CANCELLED = "Cancelled"

class BaseDocument:
    """
    Base class for all ERP documents (DocTypes).
    Implements the core logic for:
    - Metadata-driven fields
    - Hooks (lifecycle methods)
    - State Transitions
    - Validation rules
    """
    
    # To be overridden by subclasses
    doctype: str = "Base"
    fields: Dict[str, Any] = {}
    
    def __init__(self, data: Dict[str, Any] = None):
        self._data = data or {}
        self._status = DocumentStatus.DRAFT
        self._modified_by = None
        self._modified_date = datetime.now()
        self._created_by = None
        self._created_date = datetime.now()
        
        # Ensure name exists
        if "name" not in self._data:
            self._data["name"] = self._generate_name()

    @property
    def status(self) -> str:
        return self._status

    @property
    def name(self) -> str:
        return self._data.get("name")

    def _generate_name(self) -> str:
        """Generic name generator. Subclasses can override for specific patterns (e.g., INV-2026-0001)"""
        return f"{self.doctype}-{uuid.uuid4().hex[:8].upper()}"

    def get(self, field: str, default: Any = None) -> Any:
        return self._data.get(field, default)

    def set(self, field: str, value: Any):
        self._data[field] = value
        self._modified_date = datetime.now()

    # --- Lifecycle Hooks ---
    
    def before_insert(self):
        """Called before the document is first created in the DB."""
        from .hooks import HookManager
        HookManager.trigger(self.doctype, "before_insert", self)

    def after_insert(self):
        """Called after the document is first inserted into the DB."""
        from .hooks import HookManager
        HookManager.trigger(self.doctype, "after_insert", self)

    def before_save(self):
        """Called every time the document is saved."""
        from .hooks import HookManager
        self.validate()
        HookManager.trigger(self.doctype, "before_save", self)

    def after_save(self):
        """Called after every save operation."""
        from .hooks import HookManager
        HookManager.trigger(self.doctype, "after_save", self)

    def on_submit(self, db: Session = None, tenant_id: int = None):
        """Core logic for submitting a document."""
        if self._status != DocumentStatus.DRAFT:
            raise ValueError(f"Only Draft documents can be submitted. Current status: {self._status}")
        
        from .hooks import HookManager
        HookManager.trigger(self.doctype, "on_submit", self, db=db, tenant_id=tenant_id)
        self._status = DocumentStatus.SUBMITTED

    def on_cancel(self, db: Session = None, tenant_id: int = None):
        """Core logic for cancelling a submitted document."""
        if self._status != DocumentStatus.SUBMITTED:
            raise ValueError(f"Only Submitted documents can be cancelled. Current status: {self._status}")
        
        from .hooks import HookManager
        HookManager.trigger(self.doctype, "on_cancel", self, db=db, tenant_id=tenant_id)
        self._status = DocumentStatus.CANCELLED

    def validate(self):
        """Override this to add custom validation logic."""
        # TODO: Implement metadata-based validation (field types, required, etc.)
        pass

    def to_dict(self) -> Dict[str, Any]:
        """Convert document content to a dictionary for API/JSON."""
        out = self._data.copy()
        # Always serialize status as a plain string (not the Enum object)
        out["status"] = self._status.value if isinstance(self._status, DocumentStatus) else str(self._status)
        out["doctype"] = self.doctype
        return out
