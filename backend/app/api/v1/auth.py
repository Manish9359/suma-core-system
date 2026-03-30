from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth.security import create_access_token, verify_password, get_current_user
from app.models import User
from app.schemas import LoginReq

router = APIRouter(tags=["System Auth"])

@router.post("/login")
def login(data: LoginReq, db: Session = Depends(get_db)):
    """User Login - returns JWT token."""
    login_id = data.email or data.username
    if not login_id:
        raise HTTPException(status_code=400, detail="Identification (email or username) required")
    
    user = db.query(User).filter(User.username == login_id).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(
        data={"sub": user.username, "tenant_id": user.tenant_id, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    """Return the current user's profile."""
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "tenant_id": user.tenant_id
    }

@router.post("/register")
def register_user(username: str, password: str, db: Session = Depends(get_db)):
     """Register a new user (Internal Demo)."""
     from app.core.auth.security import hash_password
     new_user = User(
         username=username,
         password=hash_password(password),
         role="Employee",
         tenant_id=1 # Assuming default tenant for demo
     )
     db.add(new_user)
     db.commit()
     return {"status": "User created successfully"}
