from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth.security import create_access_token, verify_password, hash_password, get_current_user
from app.models import User
from app.schemas import LoginReq

router = APIRouter(tags=["Auth"])

@router.post("/login")
def login(data: LoginReq, db: Session = Depends(get_db)):
    login_id = data.email or data.username
    if not login_id:
        raise HTTPException(status_code=400, detail="Email or username required")

    user = db.query(User).filter(User.username == login_id).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(
        data={"sub": user.username, "tenant_id": user.tenant_id, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.username,
        "username": user.username,
        "name": user.username.split("@")[0].title(),
        "role": user.role,
        "tenant_id": user.tenant_id
    }

@router.post("/register")
def register_user(data: LoginReq, db: Session = Depends(get_db)):
    login_id = data.email or data.username
    if not login_id:
        raise HTTPException(status_code=400, detail="Email/username required")
    existing = db.query(User).filter(User.username == login_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    new_user = User(
        username=login_id,
        password=hash_password(data.password),
        role="Employee",
        tenant_id=1
    )
    db.add(new_user)
    db.commit()
    return {"status": "User created successfully"}
