from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, AliasChoices, ConfigDict

class DocField(BaseModel):
    """Represents a single field in an ERP document."""
    model_config = ConfigDict(populate_by_name=True)

    name: str
    label: Optional[str] = None
    fieldtype: str = Field(validation_alias=AliasChoices("fieldtype", "type")) 
    options: Optional[Any] = None  # Can be a CSV string or a List[str]
    required: bool = False
    hidden: bool = False
    readonly: bool = Field(default=False, validation_alias=AliasChoices("readonly", "disabled"))
    default: Any = None
    fetch_from: Optional[str] = None
    columns: Optional[List['DocField']] = None # Recursive columns for 'Table' field types

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
