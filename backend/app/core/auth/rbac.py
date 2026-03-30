from typing import List, Dict, Set, Optional
from sqlalchemy.orm import Session
from app.models import Role, Permission

class PermissionManager:
    """
    Handles Role-Based Access Control (RBAC) for Document Types.
    Checks if a user's role has the required permission for a DocType.
    """
    
    # Permission constants
    READ = "read"
    WRITE = "write"
    CREATE = "create"
    DELETE = "delete"
    SUBMIT = "submit"
    CANCEL = "cancel"

    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    def check_permission(self, doctype: str, role_name: str, ptype: str) -> bool:
        """
        Check if a given role has permission for a DocType.
        ptype: 'read', 'write', 'create', 'delete', 'submit', 'cancel'
        """
        # 1. Admin always has full access
        if role_name == "Admin":
            return True
            
        # 2. Fetch specific permission record from DB joining with Roles
        perm = self.db.query(Permission).join(Role).filter(
            Role.name == role_name,
            Permission.doctype == doctype,
            Permission.tenant_id == self.tenant_id
        ).first()

        if not perm:
            return False
            
        # 3. Check specific flag
        return getattr(perm, f"can_{ptype}", False)

    def get_allowed_doctypes(self, role_name: str) -> List[str]:
        """Returns a list of DocTypes the role is allowed to READ."""
        if role_name == "Admin":
            # return all possible doctypes (needs a registry check)
            from app.core.doc.registry import DocRegistry
            return list(DocRegistry._registry.keys())

        perms = self.db.query(Permission).join(Role).filter(
            Role.name == role_name,
            Permission.tenant_id == self.tenant_id,
            Permission.can_read == True
        ).all()
        return [p.doctype for p in perms]
