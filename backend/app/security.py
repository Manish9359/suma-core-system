from jose import jwt, JWTError
import bcrypt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db

SECRET_KEY = "erpnext_suma_secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 600

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str):
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False

def create_token(user):
    payload = {
        "sub": user.username,
        "tenant_id": user.tenant_id,
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from .models import User
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        tenant_id = payload.get("tenant_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.username == username, User.tenant_id == tenant_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def has_permission(user, doctype: str, action: str = 'read', db: Session = None) -> bool:
    """
    Checks if a SUMA Native User has permissions for a given module/doctype.
    Admins are always allowed.
    Other users are checked against their assigned Role(s) in the Permission table.
    """
    if user.role == "Admin": return True
    if not db: return False
    
    from .models import Permission, Role
    
    # Check primary role string first
    primary_role = db.query(Role).filter(Role.name == user.role, Role.tenant_id == user.tenant_id).first()
    roles_to_check = [primary_role] if primary_role else []
    
    # Add any secondary assigned roles
    roles_to_check.extend(user.roles)
    
    if not roles_to_check:
        return False # No roles defined to check against
        
    role_ids = [r.id for r in roles_to_check if r and hasattr(r, 'id')]
    
    perms = db.query(Permission).filter(
        Permission.role_id.in_(role_ids),
        Permission.doctype == doctype
    ).all()
    
    if not perms: return False
    
    # If any of their roles allows it, they have permission
    if action == 'read': return any(p.can_read for p in perms)
    if action == 'write': return any(p.can_write for p in perms)
    if action == 'create': return any(p.can_create for p in perms)
    if action == 'delete': return any(p.can_delete for p in perms)
    if action == 'submit': return any(p.can_submit for p in perms)
    if action == 'cancel': return any(p.can_cancel for p in perms)
    
    return False
