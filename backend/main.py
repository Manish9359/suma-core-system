from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import List, Optional

# ---------- CONFIG ----------
DATABASE_URL = "sqlite:///./erp.db"
SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ---------- APP ----------
app = FastAPI(title="ERP SaaS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- DB SETUP ----------
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---------- SECURITY ----------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ---------- MODELS ----------
class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    domain = Column(String, unique=True, nullable=True)
    users = relationship("User", back_populates="tenant")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="staff")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    tenant = relationship("Tenant", back_populates="users")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    amount = Column(Float)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    customer = relationship("Customer")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    quantity = Column(Float, default=0)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)

Base.metadata.create_all(bind=engine)

# ---------- SCHEMAS ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class CustomerCreate(BaseModel):
    name: str

class InvoiceCreate(BaseModel):
    customer_id: int
    amount: float

class ProductCreate(BaseModel):
    name: str
    quantity: float

class EmployeeCreate(BaseModel):
    name: str

# ---------- UTILS ----------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)

def create_token(user: User):
    payload = {
        "sub": user.username,
        "tenant_id": user.tenant_id,
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
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

# ---------- AUTH ----------
@app.post("/api/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "role": user.role,
            "tenant_id": user.tenant_id
        }
    }

# ---------- DASHBOARD ----------
@app.get("/api/dashboard/kpis")
def dashboard_kpis(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    revenue = db.query(Invoice).filter(Invoice.tenant_id == user.tenant_id).count()
    customers = db.query(Customer).filter(Customer.tenant_id == user.tenant_id).count()
    return {"revenue": revenue, "customers": customers}

# ---------- CRM ----------
@app.get("/api/crm/customers")
def get_customers(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Customer).filter(Customer.tenant_id == user.tenant_id).all()

@app.post("/api/crm/customers")
def create_customer(data: CustomerCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Customer).filter(Customer.name == data.name, Customer.tenant_id == user.tenant_id).first()
    if existing:
        raise HTTPException(400, "Customer already exists")
    customer = Customer(name=data.name, tenant_id=user.tenant_id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

# ---------- SALES ----------
@app.get("/api/sales/invoices")
def get_invoices(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Invoice).filter(Invoice.tenant_id == user.tenant_id).all()

@app.post("/api/sales/invoices")
def create_invoice(data: InvoiceCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == data.customer_id, Customer.tenant_id == user.tenant_id).first()
    if not customer:
        raise HTTPException(400, "Customer not found")
    invoice = Invoice(customer_id=customer.id, amount=data.amount, tenant_id=user.tenant_id)
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

# ---------- INVENTORY ----------
@app.get("/api/inventory/products")
def get_products(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.tenant_id == user.tenant_id).all()

@app.post("/api/inventory/products")
def create_product(data: ProductCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = Product(name=data.name, quantity=data.quantity, tenant_id=user.tenant_id)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

# ---------- HR ----------
@app.get("/api/hr/employees")
def get_employees(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Employee).filter(Employee.tenant_id == user.tenant_id).all()

@app.post("/api/hr/employees")
def create_employee(data: EmployeeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    employee = Employee(name=data.name, tenant_id=user.tenant_id)
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee

# ---------- SEED FUNCTION ----------
def seed():
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter_by(name="Suma Surveillance Tech Pvt. Ltd.").first()
        if not tenant:
            tenant = Tenant(name="Suma Surveillance Tech Pvt. Ltd.", domain="sumatech.in")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
        admin_user = db.query(User).filter_by(username="admin@sumatech.in").first()
        if not admin_user:
            admin_user = User(
                username="admin@sumatech.in",
                password=hash_password("admin123"),
                role="admin",
                tenant_id=tenant.id
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        # Optional: Seed some default products/customers/employees
        if not db.query(Customer).filter(Customer.tenant_id == tenant.id).first():
            c = Customer(name="Default Customer", tenant_id=tenant.id)
            db.add(c)
        if not db.query(Product).filter(Product.tenant_id == tenant.id).first():
            p = Product(name="Default Product", quantity=100, tenant_id=tenant.id)
            db.add(p)
        if not db.query(Employee).filter(Employee.tenant_id == tenant.id).first():
            e = Employee(name="Default Employee", tenant_id=tenant.id)
            db.add(e)
        db.commit()
        print(f"Seed complete: tenant={tenant.name}, admin={admin_user.username}")
    finally:
        db.close()

seed()