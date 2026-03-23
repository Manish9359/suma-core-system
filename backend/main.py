from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid

from app.database import engine, Base, get_db
from app.models import Tenant, User, CustomField, Lead, Customer, Product, Invoice, InvoiceItem, Account, LedgerEntry, Employee, PurchaseOrder, WorkflowTask, CompanySettings, Quotation, QuotationItem
from app.schemas import LoginReq, TokenRes, CustomerCreate, ProductCreate, InvoiceCreate, EmployeeCreate
from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.security import hash_password, verify_password, create_token, get_current_user_token

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Extensible ERP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── AUTHENTICATION ───
@app.post("/api/auth/login", response_model=TokenRes)
def login(data: LoginReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credential")
    token = create_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.username, "name": "Admin", "role": user.role}
    }

@app.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user_token)):
    return {"id": user.id, "email": user.username, "name": "Admin", "role": user.role}

# ─── PURCHASING ───
@app.get("/api/purchasing/orders")
def get_purchasing(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(PurchaseOrder).filter(PurchaseOrder.tenant_id == user.tenant_id).all()

class PurchaseOrderCreate(BaseModel):
    vendor: str
    date: str
    items: List[dict] # simplify for now

@app.post("/api/purchasing/orders")
def create_purchasing(data: PurchaseOrderCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    po_id = f"PO-{datetime.now().year}-{str(uuid.uuid4())[:4].upper()}"
    total = sum([(i.get("qty", 0) * i.get("rate", 0)) for i in data.items])
    po = PurchaseOrder(id=po_id, vendor=data.vendor, date=data.date, items=len(data.items), total=total, status="Ordered", tenant_id=user.tenant_id)
    db.add(po)
    db.commit()
    db.refresh(po)
    return po

# ─── DASHBOARD ───
@app.get("/api/dashboard/kpis")
def get_kpis(user: User = Depends(get_current_user_token), db: Session = Depends(get_db)):
    t_id = user.tenant_id
    total_sales = db.query(func.sum(Invoice.amount)).filter(Invoice.tenant_id == t_id, Invoice.status != "Draft").scalar() or 0
    invoices = db.query(Invoice).filter(Invoice.tenant_id == t_id).count()
    low_stock = db.query(Product).filter(Product.tenant_id == t_id, Product.stock < 10).count()
    return {
        "total_sales": f"₹{total_sales:,.2f}",
        "monthly_revenue": f"₹{total_sales * 0.4:,.2f}", # Mock monthly
        "pending_invoices": db.query(Invoice).filter(Invoice.tenant_id == t_id, Invoice.status == "Draft").count(),
        "low_stock_items": low_stock,
        "sales_change": "+14%", "revenue_change": "+8%", "invoices_change": "+2%", "stock_change": "-5%",
        "active_amcs": 0, "open_tickets": 0, "amc_change": "0", "tickets_change": "0"
    }

# ─── CUSTOMIZATION (DocTypes fields) ───
@app.get("/api/system/fields/{module_name}")
def get_custom_fields(module_name: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(CustomField).filter(CustomField.module == module_name, CustomField.tenant_id == user.tenant_id).all()

# ─── CRM (Customers & Leads) ───
@app.get("/api/crm/leads")
def list_leads(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Lead).filter(Lead.tenant_id == user.tenant_id).all()

class LeadCreate(BaseModel):
    name: str
    company: str = ""
    phone: str = ""
    email: str = ""
    source: str = ""

@app.post("/api/crm/leads")
def create_lead(data: LeadCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    lead_id = f"LD-{str(uuid.uuid4())[:6].upper()}"
    lead = Lead(id=lead_id, tenant_id=user.tenant_id, name=data.name, company=data.company, phone=data.phone, email=data.email, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@app.get("/api/crm/customers")
def list_customers(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Customer).filter(Customer.tenant_id == user.tenant_id).all()

@app.post("/api/crm/customers")
def create_customer(data: CustomerCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    cust_id = f"CUST-{str(uuid.uuid4())[:6].upper()}"
    cust = Customer(id=cust_id, tenant_id=user.tenant_id, **data.dict(exclude_unset=True))
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return cust

# ─── INVENTORY ───
@app.get("/api/inventory/products")
def list_products(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Product).filter(Product.tenant_id == user.tenant_id).all()

@app.post("/api/inventory/products")
def add_product(data: ProductCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    prod = Product(tenant_id=user.tenant_id, **data.dict(exclude_unset=True))
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod

@app.put("/api/inventory/products/{sku}")
def update_product(sku: str, data: ProductCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    p = db.query(Product).filter_by(sku=sku, tenant_id=user.tenant_id).first()
    if not p: raise HTTPException(404, "Product not found")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p

@app.delete("/api/inventory/products/{sku}")
def delete_product(sku: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    p = db.query(Product).filter_by(sku=sku, tenant_id=user.tenant_id).first()
    if not p: raise HTTPException(404, "Product not found")
    db.delete(p)
    db.commit()
    return {"status": "deleted"}

@app.get("/api/inventory/summary")
def get_inv_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    t_id = user.tenant_id
    total_val = db.query(func.sum(Product.stock * Product.cost)).filter(Product.tenant_id == t_id).scalar() or 0
    return {
        "total_products": db.query(Product).filter(Product.tenant_id == t_id).count(),
        "stock_value": f"₹{total_val:,.2f}",
        "warehouses": db.query(Product.warehouse).filter(Product.tenant_id == t_id).distinct().count(),
        "low_stock_count": db.query(Product).filter(Product.tenant_id == t_id, Product.stock < 10).count()
    }

# ─── ACCOUNTING & SALES (Invoices) ───
@app.get("/api/sales/invoices")
def list_invoices(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Invoice).filter(Invoice.tenant_id == user.tenant_id).all()

@app.get("/api/sales/invoices/{inv_id}")
def get_invoice(inv_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    inv = db.query(Invoice).filter_by(id=inv_id, tenant_id=user.tenant_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    
    items = db.query(InvoiceItem).filter_by(invoice_id=inv.id).all()
    out_items = []
    for i in items:
        p = db.query(Product).filter_by(sku=i.item_code, tenant_id=user.tenant_id).first()
        out_items.append({
            "item_code": i.item_code,
            "name": p.name if p else "Unknown Items",
            "qty": i.qty,
            "rate": i.rate,
            "disc_pct": i.disc_pct,
            "amount": i.amount
        })
    
    # Customer lookup
    cust = db.query(Customer).filter_by(company=inv.customer, tenant_id=user.tenant_id).first()
    
    return {
        "id": inv.id,
        "date": inv.date,
        "status": inv.status,
        "amount": inv.amount,
        "grand_total": inv.grand_total,
        "custom_data": inv.custom_data,
        "items": out_items,
        "customer": inv.customer,
        "customer_name": inv.customer,
        "customer_contact": cust.contact if cust else "",
        "customer_address": cust.address if cust else "",
        "customer_gst": cust.gst if cust else ""
    }

class InvoiceCreateExtended(BaseModel):
    customer: str
    date: str
    items: List[dict]
    discount: float = 0.0
    custom_data: dict = {}

@app.post("/api/sales/invoices")
def add_invoice(data: InvoiceCreateExtended, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    inv_id = f"INV-{datetime.now().year}-{str(uuid.uuid4())[:4].upper()}"
    total = sum([item.get("qty",0) * item.get("rate",0) for item in data.items])
    discount = data.discount
    taxable = max(total - discount, 0)
    gst_rate = float(data.custom_data.get("gst_rate") or 0)
    cgst = round(taxable * (gst_rate / 2) / 100, 2) if gst_rate else 0
    sgst = cgst
    grand = round(taxable + cgst + sgst, 2)
    
    inv = Invoice(
        id=inv_id, customer=data.customer, date=data.date, 
        amount=total, grand_total=grand, status=data.custom_data.get("status", "Draft"), 
        tenant_id=user.tenant_id, 
        custom_data={
            "discount": discount, "gst_rate": gst_rate, 
            "cgst": cgst, "sgst": sgst, "taxable": taxable, **data.custom_data
        }
    )
    db.add(inv)
    
    for i in data.items:
        db.add(InvoiceItem(invoice_id=inv_id, item_code=i.get("item_code"), qty=i.get("qty",0), rate=i.get("rate",0), disc_pct=i.get("disc_pct",0), amount=i.get("qty",0)*i.get("rate",0)))
    
    if grand > 50000:
        db.add(WorkflowTask(doc_type="Invoice", doc_id=inv_id, action_required_by="Manager", status="Pending", tenant_id=user.tenant_id))

    db.commit()
    db.refresh(inv)
    return inv

@app.put("/api/sales/invoices/{inv_id}")
def update_invoice(inv_id: str, data: InvoiceCreateExtended, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    inv = db.query(Invoice).filter_by(id=inv_id, tenant_id=user.tenant_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    
    inv.customer = data.customer
    inv.date = data.date
    inv.status = data.custom_data.get("status", inv.status)
    
    total = sum([item.get("qty",0) * item.get("rate",0) for item in data.items])
    discount = data.discount
    taxable = total - discount if total - discount > 0 else 0
    gst_rate = float(data.custom_data.get("gst_rate", 18))
    cgst = taxable * (gst_rate / 2) / 100
    sgst = taxable * (gst_rate / 2) / 100
    grand = taxable + cgst + sgst
    
    inv.amount = total
    inv.grand_total = grand
    inv.custom_data = {
        "discount": discount, "gst_rate": gst_rate, 
        "cgst": cgst, "sgst": sgst, "taxable": taxable, **data.custom_data
    }
    
    db.query(InvoiceItem).filter_by(invoice_id=inv.id).delete()
    for i in data.items:
        db.add(InvoiceItem(invoice_id=inv_id, item_code=i.get("item_code"), qty=i.get("qty",0), rate=i.get("rate",0), disc_pct=i.get("disc_pct",0), amount=i.get("qty",0)*i.get("rate",0)))
        
    db.commit()
    db.refresh(inv)
    return inv

@app.delete("/api/sales/invoices/{inv_id}")
def delete_invoice(inv_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    inv = db.query(Invoice).filter_by(id=inv_id, tenant_id=user.tenant_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    db.query(InvoiceItem).filter_by(invoice_id=inv.id).delete()
    db.delete(inv)
    db.commit()
    return {"status": "deleted"}

from typing import List

# ─── PURCHASING ───
@app.get("/api/purchasing/orders")
def get_purchasing(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(PurchaseOrder).filter(PurchaseOrder.tenant_id == user.tenant_id).all()

class PurchaseOrderCreate(BaseModel):
    vendor: str
    date: str
    items: List[dict]

@app.post("/api/purchasing/orders")
def create_purchasing(data: PurchaseOrderCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    po_id = f"PO-{datetime.now().year}-{str(uuid.uuid4())[:4].upper()}"
    total = sum([(i.get("qty", 0) * i.get("rate", 0)) for i in data.items])
    po = PurchaseOrder(id=po_id, vendor=data.vendor, date=data.date, items=len(data.items), total=total, status="Ordered", tenant_id=user.tenant_id)
    db.add(po)
    db.commit()
    db.refresh(po)
    return po

# ─── ACCOUNTING ───
@app.get("/api/accounting/accounts")
def get_accounts(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Account).filter(Account.tenant_id == user.tenant_id).all()

@app.get("/api/accounting/summary")
def get_acc_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return {"total_revenue": "₹0", "total_expenses": "₹0", "net_profit": "₹0", "gst_payable": "₹0"}

# ─── HR ───
@app.get("/api/hr/employees")
def list_employees(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Employee).filter(Employee.tenant_id == user.tenant_id).all()

@app.post("/api/hr/employees")
def add_employee(data: EmployeeCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    emp_id = f"EMP-{str(uuid.uuid4())[:4].upper()}"
    emp = Employee(
        id=emp_id, tenant_id=user.tenant_id,
        name=data.name, role=data.role, dept=data.dept, salary=data.salary, joining=data.joining, status="Active"
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

@app.get("/api/hr/summary")
def get_hr_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    count = db.query(Employee).filter(Employee.tenant_id == user.tenant_id).count()
    payroll = db.query(func.sum(Employee.salary)).filter(Employee.tenant_id == user.tenant_id).scalar() or 0
    return {"total_employees": count, "on_leave": 0, "monthly_payroll": f"₹{payroll:,.2f}", "departments": 3}

# ─── SEED ───
def initialize_system():
    db = next(get_db())
    if not db.query(Tenant).filter_by(name="ERPBase").first():
        t = Tenant(name="ERPBase")
        db.add(t)
        db.commit()
        db.refresh(t)

        admin = User(username="admin@erp.com", password=hash_password("admin123"), role="Admin", tenant_id=t.id)
        db.add(admin)
        db.commit()
        
        # Pure initialization, strict removal of all demo products/customers.
        db.add(CustomField(module="Customer", fieldname="industry", label="Industry Sector", fieldtype="Select", tenant_id=t.id))
        db.commit()

# Call seed
initialize_system()

# ─── MISSING DASHBOARD CHARTS & ACTIVITY ───
@app.get("/api/dashboard/sales-chart")
def get_sales_chart(user: User = Depends(get_current_user_token)):
    return [{"month": "Jan", "value": 4000}, {"month": "Feb", "value": 3000}]

@app.get("/api/dashboard/revenue-chart")
def get_revenue_chart(user: User = Depends(get_current_user_token)):
    return [{"month": "Jan", "value": 14000}, {"month": "Feb", "value": 23000}]

@app.get("/api/dashboard/inventory-chart")
def get_inventory_chart(user: User = Depends(get_current_user_token)):
    return [{"name": "Smart Switches", "value": 40}, {"name": "Cameras", "value": 15}]

@app.get("/api/dashboard/recent-activity")
def get_recent_activity(user: User = Depends(get_current_user_token)):
    return [{"text": "New lead registered from Website", "time": "2 mins ago"}]

# ─── MISSING SALES ENDPOINTS ───
@app.get("/api/sales/quotations")
def get_quotations(user: User = Depends(get_current_user_token)):
    return []

@app.get("/api/sales/summary")
def get_sales_summary(user: User = Depends(get_current_user_token)):
    return {"total_invoiced": "₹0", "received": "₹0", "outstanding": "₹0"}

# ─── MISSING SERVICE, AMC, INSTALLATION STUBS ───
@app.get("/api/accounting/ledger")
def get_ledger(user: User = Depends(get_current_user_token)): return []

@app.get("/api/service/tickets")
def get_tickets(user: User = Depends(get_current_user_token)): return []

@app.get("/api/service/summary")
def get_service_summary(user: User = Depends(get_current_user_token)):
    return {"open": 0, "in_progress": 0, "resolved": 0, "closed": 0}

@app.get("/api/amc/contracts")
def get_contracts(user: User = Depends(get_current_user_token)): return []

@app.get("/api/amc/summary")
def get_amc_summary(user: User = Depends(get_current_user_token)):
    return {"active": 0, "renewal_due": 0, "expired": 0}

@app.get("/api/installations/projects")
def get_projects(user: User = Depends(get_current_user_token)): return []

# ─── COMPANY SETTINGS ───
class CompanySettingsSchema(BaseModel):
    company_name: str = "My Company"
    gstin: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    bank_name: str = ""
    bank_account: str = ""
    bank_ifsc: str = ""
    bank_branch: str = ""
    terms: str = ""

@app.get("/api/settings/company")
def get_company_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    s = db.query(CompanySettings).filter_by(tenant_id=user.tenant_id).first()
    if not s:
        s = CompanySettings(tenant_id=user.tenant_id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s

@app.put("/api/settings/company")
def save_company_settings(data: CompanySettingsSchema, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    s = db.query(CompanySettings).filter_by(tenant_id=user.tenant_id).first()
    if not s:
        s = CompanySettings(tenant_id=user.tenant_id)
        db.add(s)
    for k, v in data.dict().items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s

# ─── QUOTATIONS ───
class QuotationCreateSchema(BaseModel):
    customer: str
    date: str
    valid_till: str = ""
    items: list = []
    discount: float = 0.0
    custom_data: dict = {}

@app.get("/api/sales/quotations")
def list_quotations(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Quotation).filter(Quotation.tenant_id == user.tenant_id).all()

@app.get("/api/sales/quotations/{q_id}")
def get_quotation(q_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    q = db.query(Quotation).filter_by(id=q_id, tenant_id=user.tenant_id).first()
    if not q: raise HTTPException(404, "Quotation not found")
    items = db.query(QuotationItem).filter_by(quotation_id=q.id).all()
    out_items = []
    for i in items:
        p = db.query(Product).filter_by(sku=i.item_code, tenant_id=user.tenant_id).first()
        out_items.append({"item_code": i.item_code, "name": p.name if p else "Unknown", "qty": i.qty, "rate": i.rate, "disc_pct": i.disc_pct, "amount": i.amount})
    cust = db.query(Customer).filter_by(company=q.customer, tenant_id=user.tenant_id).first()
    return {"id": q.id, "customer": q.customer, "customer_name": q.customer, "date": q.date, "valid_till": q.valid_till, "status": q.status, "amount": q.amount, "grand_total": q.grand_total, "custom_data": q.custom_data, "items": out_items, "customer_contact": cust.contact if cust else "", "customer_address": cust.address if cust else "", "customer_gst": cust.gst if cust else ""}

@app.post("/api/sales/quotations")
def create_quotation(data: QuotationCreateSchema, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    q_id = f"QTN-{datetime.now().year}-{str(uuid.uuid4())[:4].upper()}"
    total = sum([item.get("qty",0) * item.get("rate",0) for item in data.items])
    disc = sum([item.get("qty",0)*item.get("rate",0)*(item.get("disc_pct",0)/100) for item in data.items])
    taxable = max(total - disc, 0)
    gst_rate = float(data.custom_data.get("gst_rate") or 0)
    cgst = round(taxable*(gst_rate/2)/100, 2) if gst_rate else 0
    grand = round(taxable + cgst*2, 2)
    q = Quotation(id=q_id, customer=data.customer, date=data.date, valid_till=data.valid_till, amount=total, grand_total=grand, status=data.custom_data.get("status","Draft"), tenant_id=user.tenant_id, custom_data={"discount": disc, "gst_rate": gst_rate, "cgst": cgst, "sgst": cgst, "taxable": taxable, **data.custom_data})
    db.add(q)
    for i in data.items:
        db.add(QuotationItem(quotation_id=q_id, item_code=i.get("item_code"), qty=i.get("qty",0), rate=i.get("rate",0), disc_pct=i.get("disc_pct",0), amount=i.get("qty",0)*i.get("rate",0)))
    db.commit()
    db.refresh(q)
    return q

@app.put("/api/sales/quotations/{q_id}")
def update_quotation(q_id: str, data: QuotationCreateSchema, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    q = db.query(Quotation).filter_by(id=q_id, tenant_id=user.tenant_id).first()
    if not q: raise HTTPException(404, "Quotation not found")
    total = sum([item.get("qty",0)*item.get("rate",0) for item in data.items])
    disc = sum([item.get("qty",0)*item.get("rate",0)*(item.get("disc_pct",0)/100) for item in data.items])
    taxable = max(total-disc, 0)
    gst_rate = float(data.custom_data.get("gst_rate") or 0)
    cgst = round(taxable*(gst_rate/2)/100,2) if gst_rate else 0
    q.customer=data.customer; q.date=data.date; q.valid_till=data.valid_till
    q.amount=total; q.grand_total=round(taxable+cgst*2,2)
    q.status=data.custom_data.get("status",q.status)
    q.custom_data={"discount":disc,"gst_rate":gst_rate,"cgst":cgst,"sgst":cgst,"taxable":taxable,**data.custom_data}
    db.query(QuotationItem).filter_by(quotation_id=q.id).delete()
    for i in data.items:
        db.add(QuotationItem(quotation_id=q_id, item_code=i.get("item_code"), qty=i.get("qty",0), rate=i.get("rate",0), disc_pct=i.get("disc_pct",0), amount=i.get("qty",0)*i.get("rate",0)))
    db.commit(); db.refresh(q)
    return q

@app.delete("/api/sales/quotations/{q_id}")
def delete_quotation(q_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    q = db.query(Quotation).filter_by(id=q_id, tenant_id=user.tenant_id).first()
    if not q: raise HTTPException(404)
    db.query(QuotationItem).filter_by(quotation_id=q.id).delete()
    db.delete(q); db.commit()
    return {"status": "deleted"}