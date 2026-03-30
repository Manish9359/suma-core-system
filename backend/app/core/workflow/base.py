from typing import Any, List, Dict, Optional
from pydantic import BaseModel

class WorkflowTransition(BaseModel):
    state: str           # The current state
    action: str          # The action triggered by user
    next_state: str      # The target state if action succeeds
    allowed_roles: List[str] = [] # Roles that can perform this action

class Workflow(BaseModel):
    name: str
    doctype: str
    is_active: bool = True
    states: List[str] = ["Draft", "Submitted", "Cancelled"]
    transitions: List[WorkflowTransition] = []

class WorkflowEngine:
    """Handles state transitions for documents based on predefined workflows."""
    
    def __init__(self, workflow: Workflow):
        self.workflow = workflow

    def can_transition(self, current_state: str, action: str, user_role: str) -> Optional[WorkflowTransition]:
        """Check if a transition is valid for the current user and state."""
        for t in self.workflow.transitions:
            if t.state == current_state and t.action == action:
                if not t.allowed_roles or user_role in t.allowed_roles:
                    return t
        return None

    def execute(self, doc: Any, action: str, user_role: str):
        """Perform the state transition and update document metadata."""
        current_state = doc.get("workflow_state", "Draft")
        transition = self.can_transition(current_state, action, user_role)
        
        if not transition:
            raise ValueError(
                f"Invalid transition from '{current_state}' using action '{action}' for role '{user_role}'"
            )
            
        # Update the document state
        doc.set("workflow_state", transition.next_state)
        return doc
