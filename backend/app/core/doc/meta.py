from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class DocField(BaseModel):
    """Represents a single field in an ERP document."""
    name: str
    label: Optional[str] = None
    fieldtype: str  # Data, Select, Link, Float, Int, Date, Text, Table
    options: Optional[str] = None  # For Select type or Link type (which DocType it links to)
    required: bool = False
    hidden: bool = False
    readonly: bool = False
    default: Any = None

class DocTypeMetadata(BaseModel):
    """Represents the schema and configuration for an ERP document type."""
    name: str
    module: str
    fields: List[DocField] = []
    naming_rule: str = "Autoincrement" # UUID, Prefix, Manual
    naming_prefix: Optional[str] = None
    track_changes: bool = True
    
    # Permission rules (Role-Based Access Control)
    permissions: List[Dict[str, Any]] = []

    # Workflow configuration
    workflow_state_field: str = "workflow_state"
    states: List[str] = ["Draft", "Submitted", "Cancelled"]
