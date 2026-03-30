from jose import jwt, JWTError
import bcrypt
import time
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db

# Unified Security Configuration
SECRET_KEY = "suma_core_v1_secret" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 600

# Primary OAuth2 scheme for the system
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = int(time.time() + (ACCESS_TOKEN_EXPIRE_MINUTES * 60))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Dependency to retrieve the current user from a JWT token."""
    from app.models import User
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        tenant_id: int = payload.get("tenant_id")
        if username is None or tenant_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username, User.tenant_id == tenant_id).first()
    if user is None:
        raise credentials_exception
    return user

def check_permission(user, doctype: str, action: str, db: Session) -> bool:
    """
    Check if a user has permission for a specific DocType and action.
    Considers both the user's primary role and any secondary assigned roles.
    """
    if user.role == "Admin":
        return True
        
    from app.models import Permission, Role
    
    # 1. Identify all roles assigned to user
    # Start with the primary role (from user.role string)
    primary_role = db.query(Role).filter(Role.name == user.role, Role.tenant_id == user.tenant_id).first()
    roles_to_check = [primary_role] if primary_role else []
    
    # Add any secondary assigned roles (from user.roles relationship)
    if hasattr(user, 'roles'):
        roles_to_check.extend(user.roles)
        
    if not roles_to_check:
        return False
        
    role_ids = [r.id for r in roles_to_check if r and hasattr(r, 'id')]
    
    # 2. Query permissions for these roles
    perms = db.query(Permission).filter(
        Permission.role_id.in_(role_ids),
        Permission.doctype == doctype
    ).all()
    
    if not perms:
        return False
        
    actions_map = {
        "read": "can_read",
        "write": "can_write",
        "create": "can_create",
        "delete": "can_delete",
        "submit": "can_submit",
        "cancel": "can_cancel"
    }
    
    field = actions_map.get(action)
    if not field:
        return False
        
    # If any of their roles allows it, they have permission
    return any(getattr(p, field, False) for p in perms)
