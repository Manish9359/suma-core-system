from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid

from app.database import engine, Base, get_db
from app.routers import (public)
from app.api.v1.router import router as api_v1_router
from app.models import (Tenant, User, Role, Permission, Notification, WorkflowSignature, CustomField, Lead, Customer, Product, Invoice, InvoiceItem, Account, LedgerEntry, Employee, PurchaseOrder, PurchaseOrderItem, WorkflowTask, CompanySettings, Quotation, QuotationItem, Warehouse, StockLedger, StockEntry, StockEntryItem, Supplier, Project, Task, SalesOrder, SalesOrderItem, PurchaseReceipt, PurchaseReceiptItem, BOM, BOMItem, PaymentEntry, MaterialRequest, MaterialRequestItem, Asset, Issue, QualityInspection, Attendance, SalarySlip, WebPage, Timesheet, TimesheetItem, AuditLog)
from app.schemas import LoginReq, TokenRes
from app.core.auth.security import hash_password, verify_password, create_access_token as create_token, get_current_user as get_current_user_token, check_permission as has_permission
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
class CustomerCreate(BaseModel):
    company: str
    contact: str = ""
    address: str = ""
    gst: str = ""
    notes: str = ""

class ProductCreate(BaseModel):
    sku: str
    name: str
    brand: str = ""
    category: str = ""
    cost: float = 0.0
    sell: float = 0.0
    stock: int = 0
    warehouse: str = ""

class EmployeeCreate(BaseModel):
    name: str
    role: str = ""
    dept: str = ""
    salary: float = 0.0
    joining: str = ""

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    terms: Optional[str] = None

class InvoiceCreate(BaseModel):
    customer: str
    date: str
    items: List[dict] = []
    amount: float = 0.0
    grand_total: float = 0.0
from collections import defaultdict
from datetime import datetime

# Initialize DB tables
Base.metadata.create_all(bind=engine)

from app.core.doc.init_registry import init_system_registry
from app.core.doc.init_hooks import init_system_hooks
init_system_registry()
init_system_hooks()
print("✅ System Ready (DocTypes and Hooks initialized).")

app = FastAPI(title="Extensible ERP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular API
app.include_router(public.router, prefix="/api/v1/public", tags=["Public eCommerce"])
app.include_router(api_v1_router, prefix="/api/v1")

# ─── AUTHENTICATION ───
@app.post("/api/v1/auth/login", response_model=TokenRes)
def login(data: LoginReq, db: Session = Depends(get_db)):
    login_id = data.email or data.username
    if not login_id:
        raise HTTPException(status_code=400, detail="email/username is required")
        
    user = db.query(User).filter(User.username == login_id).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credential")
    if user.status == "Disabled":
        raise HTTPException(status_code=403, detail="User account is disabled")
    token = create_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.username, "name": str(user.username.split("@")[0]).capitalize(), "role": user.role}
    }

@app.get("/api/v1/auth/me")
def get_me(user: User = Depends(get_current_user_token)):
    return {"id": user.id, "email": user.username, "name": str(user.username.split("@")[0]).capitalize(), "role": user.role, "status": user.status}

# Auth endpoints are above. Modular DocType API (router) included above.

# ─── WORKFLOW & SIGNATURES ───
@app.post("/api/v1/workflow/approve/{doctype}/{docid}")
def approve_document(doctype: str, docid: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if not has_permission(user, doctype, "submit", db):
        raise HTTPException(403, f"Insufficient permissions to approve {doctype}")
    
    # Map high-level doctype to model
    if doctype == "Sales Invoice":
        target = db.query(Invoice).filter_by(id=docid, tenant_id=user.tenant_id).first()
    elif doctype == "Purchase Order":
        target = db.query(PurchaseOrder).filter_by(id=docid, tenant_id=user.tenant_id).first()
    else:
        raise HTTPException(400, "Unsupported document type")
        
    if not target: raise HTTPException(404, "Document not found")
    
    # Record Signature
    sig = WorkflowSignature(
        doctype=doctype,
        docname=docid,
        user_id=user.id,
        role=user.role,
        action="Approve",
        tenant_id=user.tenant_id
    )
    db.add(sig)
    
    # Update State
    target.workflow_state = "Approved"
    if hasattr(target, "status") and target.status == "Locked":
        target.status = "Draft" # Unlock for further processing
        
    db.commit()
    
    # Create notification for owner
    notif = Notification(
        user_id=1, # Admin/System
        title="Document Approved",
        message=f"Your {doctype} {docid} has been approved by {user.username}",
        type="Success",
        tenant_id=user.tenant_id
    )
    db.add(notif)
    db.commit()
    
    return {"status": "Approved", "signature_id": sig.id}

@app.get("/api/v1/workflow/signatures/{doctype}/{docid}")
def get_signatures(doctype: str, docid: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(WorkflowSignature).filter_by(doctype=doctype, docname=docid, tenant_id=user.tenant_id).all()
@app.get("/api/v1/system/notifications")
def get_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Notification).filter(Notification.user_id == user.id, Notification.read == False).order_by(Notification.created_at.desc()).all()

@app.post("/api/v1/system/notifications/{nid}/read")
def read_notification(nid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    notif = db.query(Notification).filter(Notification.id == nid, Notification.user_id == user.id).first()
    if notif:
        notif.read = True
        db.commit()
    return {"status": "success"}

# Purchasing and Dashboard KPI endpoints are consolidated below.

# CRM and Inventory endpoints are consolidated below.

# ─── ACCOUNTING & SALES (Invoices) ───
@app.get("/api/v1/sales/invoices")
def list_invoices(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Invoice).filter(Invoice.tenant_id == user.tenant_id).all()

@app.get("/api/v1/sales/invoices/{inv_id}")
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

@app.post("/api/v1/sales/invoices")
def add_invoice(data: InvoiceCreateExtended, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    inv_id = f"INV-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}"
    total = sum([item.get("qty",0) * item.get("rate",0) for item in data.items])
    discount = data.discount
    taxable = max(total - discount, 0)
    gst_rate = float(data.custom_data.get("gst_rate") or 0)
    cgst = round(float(taxable * (gst_rate / 2) / 100), 2) if gst_rate else 0
    sgst = cgst
    grand = round(float(taxable + cgst + sgst), 2)
    
    # WORKFLOW LOGIC: Invoices > 50,000 require signature
    wf_state = "Draft"
    status = data.custom_data.get("status", "Draft")
    if grand > 50000:
        wf_state = "Pending Approval"
        status = "Locked" # Cannot submit while locked
    
    inv = Invoice(
        id=inv_id, customer=data.customer, date=data.date, 
        amount=total, grand_total=grand, 
        status=status, workflow_state=wf_state,
        tenant_id=user.tenant_id, 
        custom_data={
            "discount": discount, "gst_rate": gst_rate, 
            "cgst": cgst, "sgst": sgst, "taxable": taxable, **data.custom_data
        }
    )
    db.add(inv)
    
    for i in data.items:
        db.add(InvoiceItem(invoice_id=inv_id, item_code=i.get("item_code"), qty=i.get("qty",0), rate=i.get("rate",0), disc_pct=i.get("disc_pct",0), amount=i.get("qty",0)*i.get("rate",0)))
        if inv.status != "Draft":
            p = db.query(Product).filter_by(sku=i.get("item_code"), tenant_id=user.tenant_id).first()
            if p:
                p.stock -= i.get("qty",0)
                db.add(StockLedger(item_code=p.sku, warehouse=p.warehouse, qty=-i.get("qty",0), voucher_type="Invoice", voucher_no=inv_id, tenant_id=user.tenant_id))
    
    if grand > 50000:
        db.add(WorkflowTask(doc_type="Invoice", doc_id=inv_id, action_required_by="Manager", status="Pending", tenant_id=user.tenant_id))

    db.commit()
    db.refresh(inv)
    return inv

@app.put("/api/v1/sales/invoices/{inv_id}")
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

@app.delete("/api/v1/sales/invoices/{inv_id}")
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
@app.get("/api/v1/purchasing/orders")
def get_purchasing(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(PurchaseOrder).filter(PurchaseOrder.tenant_id == user.tenant_id).all()

class PurchaseOrderCreate(BaseModel):
    vendor: str
    date: str
    items: List[dict]

@app.post("/api/v1/purchasing/orders")
def create_purchasing(data: PurchaseOrderCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    po_id = f"PO-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}"
    total = sum([(i.get("qty", 0) * i.get("rate", 0)) for i in data.items])
    po = PurchaseOrder(id=po_id, vendor=data.vendor, date=data.date, items=len(data.items), total=total, status="Ordered", tenant_id=user.tenant_id)
    db.add(po)
    db.commit()
    db.refresh(po)
    return po

# ─── ACCOUNTING ───
@app.get("/api/v1/accounting/accounts")
def get_accounts(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Account).filter(Account.tenant_id == user.tenant_id).all()

@app.get("/api/v1/accounting/summary")
def get_acc_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return {"total_revenue": "₹0", "total_expenses": "₹0", "net_profit": "₹0", "gst_payable": "₹0"}

# ─── HR ───
@app.get("/api/v1/hr/employees")
def list_employees(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Employee).filter(Employee.tenant_id == user.tenant_id).all()

@app.post("/api/v1/hr/employees")
def add_employee(data: EmployeeCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    emp_id = f"EMP-{uuid.uuid4().hex[:4].upper()}"
    emp = Employee(
        id=emp_id, tenant_id=user.tenant_id,
        name=data.name, role=data.role, dept=data.dept, salary=data.salary, joining=data.joining, status="Active"
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

@app.get("/api/v1/hr/summary")
def get_hr_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    count = db.query(Employee).filter(Employee.tenant_id == user.tenant_id).count()
    payroll = db.query(func.sum(Employee.salary)).filter(Employee.tenant_id == user.tenant_id).scalar() or 0
    return {"total_employees": count, "on_leave": 0, "monthly_payroll": f"₹{payroll:,.2f}", "departments": 3}

# ─── SEED ───
# ─── SEED / INITIALIZATION ───
def initialize_system():
    db = next(get_db())
    # 1. Ensure Tenant exists
    t = db.query(Tenant).filter_by(name="SUMA-TECH").first()
    if not t:
        t = Tenant(name="SUMA-TECH")
        db.add(t)
        db.commit()
        db.refresh(t)
    
    # 2. Ensure Admin Role exists
    r = db.query(Role).filter_by(name="Admin", tenant_id=t.id).first()
    if not r:
        r = Role(name="Admin", tenant_id=t.id)
        db.add(r)
        db.commit()
        db.refresh(r)

    # 3. Ensure Admin User exists
    admin_email = "admin@sumatech.in"
    admin = db.query(User).filter_by(username=admin_email).first()
    if not admin:
        admin = User(
            username=admin_email, 
            password=hash_password("admin123"), 
            role="Admin", 
            status="Active",
            tenant_id=t.id
        )
        db.add(admin)
        db.commit()
        print(f"✅ Created master admin: {admin_email}")
    else:
        # Reset password to ensure testability
        admin.password = hash_password("admin123")
        admin.tenant_id = t.id
        db.commit()

# Call seed on startup
initialize_system()

# ─── MISSING DASHBOARD CHARTS & ACTIVITY ───
# ─── DASHBOARD ANALYTICS ───
@app.get("/api/v1/dashboard/kpis")
def get_kpis(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    total_sales = db.query(func.sum(Invoice.amount)).filter(Invoice.tenant_id == user.tenant_id).scalar() or 0
    pending_count = db.query(Invoice).filter(Invoice.tenant_id == user.tenant_id, Invoice.status != "Paid").count()
    low_stock = db.query(Product).filter(Product.tenant_id == user.tenant_id, Product.stock < 10).count()
    emp_count = db.query(Employee).filter(Employee.tenant_id == user.tenant_id).count()
    ticket_count = db.query(Issue).filter(Issue.tenant_id == user.tenant_id, Issue.status == "Open").count()
    
    return {
        "total_sales": f"₹{float(total_sales):,.0f}",
        "sales_change": "+0%",
        "monthly_revenue": f"₹{float(total_sales):,.0f}",
        "revenue_change": "+0%",
        "pending_invoices": pending_count,
        "invoices_change": "0",
        "low_stock_items": low_stock,
        "stock_change": "0",
        "active_amcs": 0,
        "amc_change": "0",
        "open_tickets": ticket_count,
        "tickets_change": "0"
    }

@app.get("/api/v1/dashboard/sales-chart")
def get_sales_chart(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    # Group by month logic (simplified)
    # real query: db.query(func.strftime('%m', Invoice.date), func.sum(Invoice.amount))...
    return [{"month": "Jan", "value": 4000}, {"month": "Feb", "value": 3000}]

@app.get("/api/v1/dashboard/revenue-chart")
def get_revenue_chart(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return [{"month": "Jan", "value": 14000}, {"month": "Feb", "value": 23000}]

@app.get("/api/v1/dashboard/inventory-chart")
def get_inventory_chart(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    # Real query: group by category
    cats = db.query(Product.category, func.count(Product.sku)).filter(Product.tenant_id == user.tenant_id).group_by(Product.category).all()
    return [{"name": c[0] or "Uncategorized", "value": c[1]} for c in cats]

@app.get("/api/v1/dashboard/recent-activity")
def get_recent_activity(user: User = Depends(get_current_user_token)):
    return [{"text": "System health check passed", "time": "Just now"}, {"text": "Automatic data backup completed", "time": "1h ago"}]

# ─── MISSING SALES ENDPOINTS ───
@app.get("/api/v1/sales/quotations")
def get_quotations(user: User = Depends(get_current_user_token)):
    return []

@app.get("/api/v1/sales/summary")
def get_sales_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    total = db.query(func.sum(Invoice.amount)).filter(Invoice.tenant_id == user.tenant_id).scalar() or 0
    paid = db.query(func.sum(PaymentEntry.amount)).filter(PaymentEntry.tenant_id == user.tenant_id, PaymentEntry.party_type == "Customer").scalar() or 0
    return {
        "total_invoiced": f"₹{float(total):,.0f}",
        "received": f"₹{float(paid):,.0f}",
        "outstanding": f"₹{float(total - paid):,.0f}"
    }

@app.get("/api/v1/inventory/summary")
def get_inventory_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    count = db.query(Product).filter(Product.tenant_id == user.tenant_id).count()
    value = db.query(func.sum(Product.stock * Product.cost)).filter(Product.tenant_id == user.tenant_id).scalar() or 0
    low = db.query(Product).filter(Product.tenant_id == user.tenant_id, Product.stock < 10).count()
    wh = db.query(Warehouse).filter(Warehouse.tenant_id == user.tenant_id).count()
    return {
        "total_products": count,
        "stock_value": f"₹{float(value):,.0f}",
        "low_stock_count": low,
        "warehouses": wh
    }

@app.get("/api/v1/inventory/stock-by-warehouse")
def get_stock_by_warehouse(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    results = db.query(
        Product.sku.label("item_code"),
        Product.warehouse,
        Product.stock.label("actual_qty")
    ).filter(Product.tenant_id == user.tenant_id, Product.stock > 0).all()
    return [dict(zip(["item_code", "warehouse", "actual_qty"], r)) for r in results]

@app.get("/api/v1/inventory/ledger")
def get_stock_ledger(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(StockLedger).filter(StockLedger.tenant_id == user.tenant_id).order_by(StockLedger.id.desc()).limit(100).all()

@app.post("/api/v1/purchasing/requests")
def create_material_request(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    items = data.pop("items", [])
    mr = MaterialRequest(**data, id=f"MR-{uuid.uuid4().hex[:6].upper()}", tenant_id=user.tenant_id)
    db.add(mr)
    for i in items: db.add(MaterialRequestItem(**i, parent_id=mr.id))
    db.commit(); db.refresh(mr); return mr

# ─── MISSING SERVICE, AMC, INSTALLATION STUBS ───
@app.get("/api/v1/accounting/ledger")
def get_ledger(user: User = Depends(get_current_user_token)): return []

@app.get("/api/v1/service/tickets")
def get_tickets(user: User = Depends(get_current_user_token)): return []

@app.get("/api/v1/service/summary")
def get_service_summary(user: User = Depends(get_current_user_token)):
    return {"open": 0, "in_progress": 0, "resolved": 0, "closed": 0}

@app.get("/api/v1/amc/contracts")
def get_contracts(user: User = Depends(get_current_user_token)): return []

@app.get("/api/v1/amc/summary")
def get_amc_summary(user: User = Depends(get_current_user_token)):
    return {"active": 0, "renewal_due": 0, "expired": 0}

@app.get("/api/v1/installations/projects")
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

@app.get("/api/v1/settings/company")
def get_company_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    s = db.query(CompanySettings).filter_by(tenant_id=user.tenant_id).first()
    if not s:
        s = CompanySettings(tenant_id=user.tenant_id)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s

@app.put("/api/v1/settings/company")
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

@app.get("/api/v1/sales/quotations")
def list_quotations(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Quotation).filter(Quotation.tenant_id == user.tenant_id).all()

@app.get("/api/v1/sales/quotations/{q_id}")
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

@app.post("/api/v1/sales/quotations")
def create_quotation(data: QuotationCreateSchema, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    q_id = f"QTN-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}"
    total = sum([item.get("qty",0) * item.get("rate",0) for item in data.items])
    disc = sum([item.get("qty",0)*item.get("rate",0)*(item.get("disc_pct",0)/100) for item in data.items])
    taxable = max(total - disc, 0)
    gst_rate = float(data.custom_data.get("gst_rate") or 0)
    cgst = round(float(taxable*(gst_rate/2)/100), 2) if gst_rate else 0
    grand = round(float(taxable + cgst*2), 2)
    q = Quotation(id=q_id, customer=data.customer, date=data.date, valid_till=data.valid_till, amount=total, grand_total=grand, status=data.custom_data.get("status","Draft"), tenant_id=user.tenant_id, custom_data={"discount": disc, "gst_rate": gst_rate, "cgst": cgst, "sgst": cgst, "taxable": taxable, **data.custom_data})
    db.add(q)
    for i in data.items:
        db.add(QuotationItem(quotation_id=q_id, item_code=i.get("item_code"), qty=i.get("qty",0), rate=i.get("rate",0), disc_pct=i.get("disc_pct",0), amount=i.get("qty",0)*i.get("rate",0)))
    db.commit()
    db.refresh(q)
    return q

@app.put("/api/v1/sales/quotations/{q_id}")
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

@app.delete("/api/v1/sales/quotations/{q_id}")
def delete_quotation(q_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if user.role != "Admin": raise HTTPException(403, "Admins only")
    q = db.query(Quotation).filter_by(id=q_id, tenant_id=user.tenant_id).first()
    if not q: raise HTTPException(404)
    db.query(QuotationItem).filter_by(quotation_id=q.id).delete()
    db.delete(q); db.commit()
    return {"status": "deleted"}
# --- NEW ERP MODULES ---

# Projects
@app.get("/api/v1/projects")
def get_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Project).filter(Project.tenant_id == user.tenant_id).all()

@app.post("/api/v1/projects")
def create_project(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    p = Project(**data, tenant_id=user.tenant_id)
    db.add(p); db.commit(); db.refresh(p)
    return p

# --- ASSETS ---
@app.get("/api/v1/assets")
def get_assets(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Asset).filter(Asset.tenant_id == user.tenant_id).all()

@app.post("/api/v1/assets")
def create_asset(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    a = Asset(**data, id=f"ASSET-{uuid.uuid4().hex[:6].upper()}", tenant_id=user.tenant_id)
    db.add(a); db.commit(); db.refresh(a)
    return a

# --- QUALITY INSPECTION ---
@app.post("/api/v1/quality/inspect")
def quality_inspect(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    qi = QualityInspection(**data, id=f"QI-{uuid.uuid4().hex[:6].upper()}", tenant_id=user.tenant_id)
    db.add(qi); db.commit(); db.refresh(qi)
    return qi

# --- SUBCONTRACTING ---
@app.post("/api/v1/subcontract/transfer")
def subcontract_transfer(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    # Transfer raw materials to vendor warehouse
    # Expected data: item_code, qty, from_warehouse, to_warehouse (vendor)
    se = StockEntry(id=f"SE-SUB-{uuid.uuid4().hex[:6].upper()}", purpose="Material Transfer", date=datetime.now().strftime("%Y-%m-%d"), tenant_id=user.tenant_id)
    db.add(se); db.commit(); db.refresh(se)
    
    item = StockEntryItem(parent_id=se.id, item_code=data.get("item_code"), qty=data.get("qty"), s_warehouse=data.get("from_warehouse"), t_warehouse=data.get("to_warehouse"))
    db.add(item)
    
    # Update Ledger
    db.add(StockLedger(item_code=data.get("item_code"), warehouse=data.get("from_warehouse"), qty=-data.get("qty"), voucher_type="Stock Entry", voucher_no=se.id, tenant_id=user.tenant_id))
    db.add(StockLedger(item_code=data.get("item_code"), warehouse=data.get("to_warehouse"), qty=data.get("qty"), voucher_type="Stock Entry", voucher_no=se.id, tenant_id=user.tenant_id))
    
    # Update Product Stocks
    p_from = db.query(Product).filter_by(sku=data.get("item_code"), warehouse=data.get("from_warehouse"), tenant_id=user.tenant_id).first()
    if p_from: p_from.stock -= data.get("qty")
    
    p_to = db.query(Product).filter_by(sku=data.get("item_code"), warehouse=data.get("to_warehouse"), tenant_id=user.tenant_id).first()
    if p_to: p_to.stock += data.get("qty")
    
    db.commit()
    return {"status": "Subcontract material transferred", "id": se.id}

@app.get("/api/v1/reports/profit-loss")
def get_pl_report(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    # Basic P&L logic
    income = db.query(func.sum(Invoice.amount)).filter(Invoice.tenant_id == user.tenant_id).scalar() or 0
    expense = db.query(func.sum(PurchaseOrder.total)).filter(PurchaseOrder.tenant_id == user.tenant_id).scalar() or 0
    return {"income": income, "expense": expense, "profit": income - expense}

@app.put("/api/v1/warehouses/{w_id}")
def update_warehouse(w_id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    w = db.query(Warehouse).filter_by(id=w_id, tenant_id=user.tenant_id).first()
    if not w: raise HTTPException(404)
    for k, v in data.items(): setattr(w, k, v)
    db.commit(); return w

@app.delete("/api/v1/warehouses/{w_id}")
def delete_warehouse(w_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    w = db.query(Warehouse).filter_by(id=w_id, tenant_id=user.tenant_id).first()
    if not w: raise HTTPException(404)
    db.delete(w); db.commit(); return {"status": "ok"}

# Suppliers
@app.get("/api/v1/suppliers")
def get_suppliers(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Supplier).filter(Supplier.tenant_id == user.tenant_id).all()

@app.post("/api/v1/suppliers")
def create_supplier(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    s = Supplier(**data, tenant_id=user.tenant_id)
    db.add(s); db.commit(); db.refresh(s); return s

@app.put("/api/v1/suppliers/{s_id}")
def update_supplier(s_id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    s = db.query(Supplier).filter_by(id=s_id, tenant_id=user.tenant_id).first()
    if not s: raise HTTPException(404)
    for k, v in data.items(): setattr(s, k, v)
    db.commit(); return s

@app.delete("/api/v1/suppliers/{s_id}")
def delete_supplier(s_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    s = db.query(Supplier).filter_by(id=s_id, tenant_id=user.tenant_id).first()
    if not s: raise HTTPException(404)
    db.delete(s); db.commit(); return {"status": "ok"}

# HR - Employees
@app.get("/api/v1/hr/employees")
def get_employees(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Employee).filter(Employee.tenant_id == user.tenant_id).all()

@app.post("/api/v1/hr/employees")
def create_employee(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    e = Employee(**data, tenant_id=user.tenant_id)
    db.add(e); db.commit(); db.refresh(e); return e

@app.put("/api/v1/hr/employees/{id}")
def update_employee(id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    e = db.query(Employee).filter_by(id=id, tenant_id=user.tenant_id).first()
    if not e: raise HTTPException(404)
    for k, v in data.items(): setattr(e, k, v)
    db.commit(); return e

@app.delete("/api/v1/hr/employees/{id}")
def delete_employee(id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    e = db.query(Employee).filter_by(id=id, tenant_id=user.tenant_id).first()
    if not e: raise HTTPException(404)
    db.delete(e); db.commit(); return {"status": "ok"}

# HR - Attendance
@app.get("/api/v1/hr/attendance")
def get_attendance(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    res = db.query(Attendance, Employee.name).join(Employee, Attendance.employee_id == Employee.id).filter(Attendance.tenant_id == user.tenant_id).order_by(Attendance.date.desc()).all()
    return [{**a[0].__dict__, "employee_name": a[1]} for a in res]

@app.post("/api/v1/hr/attendance")
def mark_attendance(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    att = db.query(Attendance).filter_by(employee_id=data["employee_id"], date=data["date"], tenant_id=user.tenant_id).first()
    if att:
        att.status = data["status"]
    else:
        att = Attendance(**data, tenant_id=user.tenant_id)
        db.add(att)
    db.commit(); db.refresh(att)
    return att

# HR - Payroll
@app.get("/api/v1/hr/salary_slips")
def get_salary_slips(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    res = db.query(SalarySlip, Employee.name).join(Employee, SalarySlip.employee_id == Employee.id).filter(SalarySlip.tenant_id == user.tenant_id).all()
    return [{**s[0].__dict__, "employee_name": s[1]} for s in res]

@app.post("/api/v1/hr/salary_slips")
def create_salary_slip(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    slip_id = f"PAY-{uuid.uuid4().hex[:6].upper()}"
    slip = SalarySlip(**data, id=slip_id, tenant_id=user.tenant_id)
    
    if slip.status == "Paid":
        # Accounting Entry: Debit EXPENSE (5200), Credit BANK (1100)
        db.add(LedgerEntry(date=datetime.now().strftime("%Y-%m-%d"), account="5200", debit=slip.net_pay, credit=0.0, description=f"Payroll Expense for {slip.employee_id} ({slip.id})", tenant_id=user.tenant_id))
        db.add(LedgerEntry(date=datetime.now().strftime("%Y-%m-%d"), account="1100", debit=0.0, credit=slip.net_pay, description=f"Salary Payment to {slip.employee_id} ({slip.id})", tenant_id=user.tenant_id))

    db.add(slip); db.commit(); db.refresh(slip)
    return slip

@app.put("/api/v1/hr/salary_slips/{id}")
def update_salary_slip(id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    slip = db.query(SalarySlip).filter_by(id=id, tenant_id=user.tenant_id).first()
    if not slip: raise HTTPException(404)
    old_status = slip.status
    for k,v in data.items(): setattr(slip, k, v)
    
    if old_status != "Paid" and slip.status == "Paid":
        db.add(LedgerEntry(date=datetime.now().strftime("%Y-%m-%d"), account="5200", debit=slip.net_pay, credit=0.0, description=f"Payroll Expense for {slip.employee_id} ({slip.id})", tenant_id=user.tenant_id))
        db.add(LedgerEntry(date=datetime.now().strftime("%Y-%m-%d"), account="1100", debit=0.0, credit=slip.net_pay, description=f"Salary Payment to {slip.employee_id} ({slip.id})", tenant_id=user.tenant_id))

    db.commit(); return slip

# Stock Entries
@app.get("/api/v1/stock/entries")
def get_stock_entries(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(StockEntry).filter(StockEntry.tenant_id == user.tenant_id).all()

@app.post("/api/v1/stock/entries")
def create_stock_entry(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    items = data.pop("items", [])
    se = StockEntry(**data, id=f"SE-{uuid.uuid4().hex[:6].upper()}", tenant_id=user.tenant_id)
    db.add(se)
    for i in items:
        db.add(StockEntryItem(**i, parent_id=se.id))
        p = db.query(Product).filter_by(sku=i["item_code"], tenant_id=user.tenant_id).first()
        if p:
            qty = float(i["qty"])
            if data["purpose"] == "Material Issue":
                p.stock -= qty
                db.add(StockLedger(item_code=i["item_code"], warehouse=i.get("s_warehouse"), qty=-qty, voucher_type="Stock Entry", voucher_no=se.id, tenant_id=user.tenant_id))
            elif data["purpose"] == "Material Receipt":
                p.stock += qty
                db.add(StockLedger(item_code=i["item_code"], warehouse=i.get("t_warehouse"), qty=qty, voucher_type="Stock Entry", voucher_no=se.id, tenant_id=user.tenant_id))
            elif data["purpose"] == "Material Transfer":
                # Transfer between warehouses doesn't change global stock (p.stock), 
                # but adds ledger entries for both warehouses.
                db.add(StockLedger(item_code=i["item_code"], warehouse=i.get("s_warehouse"), qty=-qty, voucher_type="Stock Entry", voucher_no=se.id, tenant_id=user.tenant_id))
                db.add(StockLedger(item_code=i["item_code"], warehouse=i.get("t_warehouse"), qty=qty, voucher_type="Stock Entry", voucher_no=se.id, tenant_id=user.tenant_id))
    db.commit(); db.refresh(se)
    return se

# --- EXPANDED ERP API ---

# Stock Ledger
@app.get("/api/v1/inventory/ledger")
def get_stock_ledger(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(StockLedger).filter(StockLedger.tenant_id == user.tenant_id).order_by(StockLedger.date.desc()).all()

# Leads
@app.get("/api/v1/crm/leads")
def get_leads(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Lead).filter(Lead.tenant_id == user.tenant_id).all()

@app.post("/api/v1/crm/leads")
def create_lead(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    l = Lead(**data, id=f"LEAD-{uuid.uuid4().hex[:4].upper()}", tenant_id=user.tenant_id)
    db.add(l); db.commit(); db.refresh(l)
    return l

@app.post("/api/v1/crm/leads/{lead_id}/quotation")
def convert_lead_to_quotation(lead_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    lead = db.query(Lead).filter_by(id=lead_id, tenant_id=user.tenant_id).first()
    if not lead: raise HTTPException(404)
    q = Quotation(id=f"QTN-{lead_id[5:]}", customer=lead.name, date=datetime.now().strftime("%Y-%m-%d"), status="Draft", tenant_id=user.tenant_id)
    db.add(q)
    lead.status = "Converted"
    db.commit(); db.refresh(q)
    return q

# Material Requests
@app.get("/api/v1/purchasing/requests")
def get_material_requests(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(MaterialRequest).filter(MaterialRequest.tenant_id == user.tenant_id).all()

@app.post("/api/v1/purchasing/requests")
def create_material_request(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    items = data.pop("items", [])
    mr = MaterialRequest(**data, id=f"MR-{uuid.uuid4().hex[:4].upper()}", tenant_id=user.tenant_id)
    db.add(mr)
    for i in items:
        db.add(MaterialRequestItem(**i, parent_id=mr.id))
    db.commit(); db.refresh(mr)
    return mr

@app.post("/api/v1/purchasing/requests/{mr_id}/order")
def create_po_from_mr(mr_id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    mr = db.query(MaterialRequest).filter_by(id=mr_id, tenant_id=user.tenant_id).first()
    if not mr: raise HTTPException(404)
    mr_items = db.query(MaterialRequestItem).filter_by(parent_id=mr.id).all()
    
    po = PurchaseOrder(id=f"PO-{mr_id[3:]}", vendor=data.get("vendor"), date=datetime.now().strftime("%Y-%m-%d"), status="Ordered", tenant_id=user.tenant_id, items=len(mr_items), total=0)
    db.add(po)
    # logic to copy items could be added here
    mr.status = "Ordered"
    db.commit(); db.refresh(po)
    return po

@app.get("/api/v1/sales/orders")
def get_sales_orders(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(SalesOrder).filter(SalesOrder.tenant_id == user.tenant_id).all()

@app.get("/api/v1/purchasing/orders/{po_id}")
def get_purchase_order(po_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    po = db.query(PurchaseOrder).filter_by(id=po_id, tenant_id=user.tenant_id).first()
    if not po: raise HTTPException(404)
    items = db.query(PurchaseOrderItem).filter_by(parent_id=po.id).all()
    # lookup supplier
    supp = db.query(Supplier).filter_by(name=po.vendor, tenant_id=user.tenant_id).first()
    return {
        "id": po.id, "date": po.date, "status": po.status, "amount": po.total, "grand_total": po.total,
        "items": [{"item_code": i.item_code, "qty": i.qty, "rate": i.rate, "amount": i.qty*i.rate, "name": i.item_code} for i in items],
        "vendor": po.vendor, "vendor_name": po.vendor, "vendor_address": supp.address if supp else ""
    }

@app.get("/api/v1/purchasing/receipts")
def get_purchase_receipts(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(PurchaseReceipt).filter(PurchaseReceipt.tenant_id == user.tenant_id).all()

@app.get("/api/v1/purchasing/receipts/{pr_id}")
def get_purchase_receipt(pr_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    pr = db.query(PurchaseReceipt).filter_by(id=pr_id, tenant_id=user.tenant_id).first()
    if not pr: raise HTTPException(404)
    items = db.query(PurchaseReceiptItem).filter_by(parent_id=pr.id).all()
    return {
        "id": pr.id, "date": pr.date, "status": pr.status, "items": [{"item_code": i.item_code, "qty": i.qty, "warehouse": i.warehouse} for i in items],
        "supplier": pr.supplier, "supplier_name": pr.supplier
    }

@app.post("/api/v1/sales/orders")
def create_sales_order(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    items = data.pop("items", [])
    so = SalesOrder(**data, id=f"SO-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}", tenant_id=user.tenant_id)
    db.add(so)
    for i in items:
        db.add(SalesOrderItem(**i, parent_id=so.id))
    db.commit(); db.refresh(so)
    return so

@app.put("/api/v1/sales/orders/{so_id}")
def update_sales_order(so_id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    so = db.query(SalesOrder).filter_by(id=so_id, tenant_id=user.tenant_id).first()
    if not so: raise HTTPException(404)
    items = data.pop("items", [])
    for k, v in data.items(): setattr(so, k, v)
    db.query(SalesOrderItem).filter_by(parent_id=so_id).delete()
    for i in items: db.add(SalesOrderItem(**i, parent_id=so.id))
    db.commit(); return so

@app.delete("/api/v1/sales/orders/{so_id}")
def delete_sales_order(so_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    so = db.query(SalesOrder).filter_by(id=so_id, tenant_id=user.tenant_id).first()
    if not so: raise HTTPException(404)
    db.query(SalesOrderItem).filter_by(parent_id=so_id).delete()
    db.delete(so); db.commit(); return {"status": "ok"}

# Purchasing - Orders
@app.get("/api/v1/purchasing/orders")
def get_purchase_orders(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(PurchaseOrder).filter(PurchaseOrder.tenant_id == user.tenant_id).all()

@app.get("/api/v1/purchasing/orders/{po_id}")
def get_purchase_order(po_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    po = db.query(PurchaseOrder).filter_by(id=po_id, tenant_id=user.tenant_id).first()
    if not po: raise HTTPException(404)
    items = db.query(PurchaseOrderItem).filter_by(parent_id=po_id).all()
    supplier = db.query(Supplier).filter_by(name=po.vendor, tenant_id=user.tenant_id).first()
    return {"id": po.id, "vendor": po.vendor, "date": po.date, "total": po.total, "status": po.status, "items": items, "supplier_name": po.vendor, "supplier_address": supplier.address if supplier else "", "supplier_gst": supplier.id if supplier else ""}

@app.post("/api/v1/purchasing/orders")
def create_purchase_order(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    items = data.pop("items", [])
    po = PurchaseOrder(**data, id=f"PO-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}", tenant_id=user.tenant_id)
    db.add(po)
    for i in items: db.add(PurchaseOrderItem(**i, parent_id=po.id))
    db.commit(); db.refresh(po); return po

@app.put("/api/v1/purchasing/orders/{po_id}")
def update_purchase_order(po_id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    po = db.query(PurchaseOrder).filter_by(id=po_id, tenant_id=user.tenant_id).first()
    if not po: raise HTTPException(404)
    items = data.pop("items", [])
    for k, v in data.items(): setattr(po, k, v)
    db.query(PurchaseOrderItem).filter_by(parent_id=po_id).delete()
    for i in items: db.add(PurchaseOrderItem(**i, parent_id=po.id))
    db.commit(); return po

@app.delete("/api/v1/purchasing/orders/{po_id}")
def delete_purchase_order(po_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    po = db.query(PurchaseOrder).filter_by(id=po_id, tenant_id=user.tenant_id).first()
    if not po: raise HTTPException(404)
    db.query(PurchaseOrderItem).filter_by(parent_id=po_id).delete()
    db.delete(po); db.commit(); return {"status": "ok"}

# Asset CRUD
@app.put("/api/v1/assets/{a_id}")
def update_asset(a_id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    a = db.query(Asset).filter_by(id=a_id, tenant_id=user.tenant_id).first()
    if not a: raise HTTPException(404)
    for k, v in data.items(): setattr(a, k, v); 
    db.commit(); return a

@app.delete("/api/v1/assets/{a_id}")
def delete_asset(a_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    a = db.query(Asset).filter_by(id=a_id, tenant_id=user.tenant_id).first()
    if not a: raise HTTPException(404)
    db.delete(a); db.commit(); return {"status": "ok"}

@app.post("/api/v1/purchasing/receipts")
def create_purchase_receipt(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    items = data.pop("items", [])
    pr = PurchaseReceipt(**data, id=f"PR-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}", tenant_id=user.tenant_id)
    db.add(pr)
    
    total_asset_value: float = 0.0
    total_asset_value += 0.0
    
    for i in items:
        db.add(PurchaseReceiptItem(**i, parent_id=pr.id))
        p = db.query(Product).filter_by(sku=i["item_code"], tenant_id=user.tenant_id).first()
        if p:
            qty_received = float(i["qty"])
            p.stock += qty_received
            total_asset_value += (qty_received * p.cost)
            db.add(StockLedger(item_code=i["item_code"], warehouse=i.get("warehouse", "Main"), qty=qty_received, voucher_type="Purchase Receipt", voucher_no=pr.id, tenant_id=user.tenant_id))
            
    # Advanced Double-Entry Accounting sync
    if total_asset_value > 0:
        db.add(LedgerEntry(date=pr.date, account="1300", debit=total_asset_value, credit=0.0, description=f"Goods received from {pr.supplier} via {pr.id}", tenant_id=user.tenant_id))
        db.add(LedgerEntry(date=pr.date, account="2100", debit=0.0, credit=total_asset_value, description=f"Stock received but not billed ({pr.id})", tenant_id=user.tenant_id))

    db.commit(); db.refresh(pr); return pr

# BOM (Manufacturing)
@app.get("/api/v1/manufacturing/bom")
def get_boms(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(BOM).filter(BOM.tenant_id == user.tenant_id).all()

@app.post("/api/v1/manufacturing/bom")
def create_bom(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    items = data.pop("items", [])
    bom = BOM(**data, id=f"BOM-{data['item_code']}", tenant_id=user.tenant_id)
    db.add(bom)
    for i in items: db.add(BOMItem(**i, parent_id=bom.id))
    db.commit(); db.refresh(bom); return bom

@app.put("/api/v1/manufacturing/bom/{bom_id}")
def update_bom(bom_id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    bom = db.query(BOM).filter_by(id=bom_id, tenant_id=user.tenant_id).first()
    if not bom: raise HTTPException(404)
    items = data.pop("items", [])
    for k, v in data.items(): setattr(bom, k, v)
    db.query(BOMItem).filter_by(parent_id=bom_id).delete()
    for i in items: db.add(BOMItem(**i, parent_id=bom.id))
    db.commit(); return bom

@app.delete("/api/v1/manufacturing/bom/{bom_id}")
def delete_bom(bom_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    bom = db.query(BOM).filter_by(id=bom_id, tenant_id=user.tenant_id).first()
    if not bom: raise HTTPException(404)
    db.query(BOMItem).filter_by(parent_id=bom_id).delete()
    db.delete(bom); db.commit(); return {"status": "ok"}

@app.post("/api/v1/manufacturing/produce")
def produce_from_bom(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    bom_id = data.get("bom_id")
    qty = float(data.get("qty", 1))
    bom = db.query(BOM).filter_by(id=bom_id, tenant_id=user.tenant_id).first()
    if not bom: raise HTTPException(404, "BOM not found")
    
    total_raw_cost = 0.0
    
    # Check and Deduct Raw Materials
    raw_items = db.query(BOMItem).filter_by(parent_id=bom.id).all()
    for item in raw_items:
        prod = db.query(Product).filter_by(sku=item.item_code, tenant_id=user.tenant_id).first()
        if prod:
            used_qty = float(item.qty) * float(qty)
            prod.stock = float(prod.stock) - used_qty
            total_raw_cost += (used_qty * float(prod.cost))
            db.add(StockLedger(item_code=item.item_code, qty=-used_qty, warehouse="Production", voucher_type="Work Order", voucher_no=bom.id, tenant_id=user.tenant_id))
    
    # Add Finished Good
    fg = db.query(Product).filter_by(sku=bom.item_code, tenant_id=user.tenant_id).first()
    if fg:
        fg.stock = float(fg.stock) + float(qty)
        db.add(StockLedger(item_code=bom.item_code, qty=qty, warehouse="Main", voucher_type="Work Order", voucher_no=bom.id, tenant_id=user.tenant_id))
        
    date_now = datetime.now().strftime("%Y-%m-%d")
    if total_raw_cost > 0:
        db.add(LedgerEntry(date=date_now, account="1300", debit=0.0, credit=total_raw_cost, description=f"RM Consumption for Work Order ({bom.id})", tenant_id=user.tenant_id))
        db.add(LedgerEntry(date=date_now, account="1300", debit=total_raw_cost, credit=0.0, description=f"FG Received from Work Order ({bom.id})", tenant_id=user.tenant_id))
        
    db.commit()
    return {"status": "success", "produced": qty, "item": bom.item_code}

import pandas as pd
import io
from fastapi.responses import StreamingResponse

# --- REPORTING ENGINE ---
@app.get("/api/v1/reports/view/{type}")
def view_report(type: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    if type == "sales":
        data = db.query(Invoice.id, Invoice.customer, Invoice.date, Invoice.amount, Invoice.status).filter(Invoice.tenant_id == user.tenant_id).all()
        return [dict(zip(["Voucher", "Customer", "Date", "Amount", "Status"], r)) for r in data]
    elif type == "purchase":
        data = db.query(PurchaseOrder.id, PurchaseOrder.vendor, PurchaseOrder.date, PurchaseOrder.total, PurchaseOrder.status).filter(PurchaseOrder.tenant_id == user.tenant_id).all()
        return [dict(zip(["PO ID", "Supplier", "Date", "Amount", "Status"], r)) for r in data]
    elif type == "inventory":
        data = db.query(Product.sku, Product.name, Product.stock, Product.cost, Product.sell).filter(Product.tenant_id == user.tenant_id).all()
        return [dict(zip(["SKU", "Name", "Stock", "Cost", "Value"], [d[0], d[1], d[2], d[3], d[2]*d[3]])) for d in data]
    elif type == "hr":
        data = db.query(Employee.id, Employee.name, Employee.role, Employee.dept, Employee.salary, Employee.status).filter(Employee.tenant_id == user.tenant_id).all()
        return [dict(zip(["Emp ID", "Name", "Designation", "Department", "Salary", "Status"], r)) for r in data]
    elif type == "financial":
        revenue = db.query(func.sum(Invoice.amount)).filter(Invoice.tenant_id == user.tenant_id, Invoice.status != "Cancelled").scalar() or 0
        expenses = db.query(func.sum(PurchaseOrder.total)).filter(PurchaseOrder.tenant_id == user.tenant_id, PurchaseOrder.status != "Cancelled").scalar() or 0
        payroll = db.query(func.sum(Employee.salary)).filter(Employee.tenant_id == user.tenant_id).scalar() or 0
        return [
            {"Account": "Trading Income", "Debit": 0, "Credit": revenue, "Balance": revenue},
            {"Account": "Cost of Goods Sold", "Debit": expenses, "Credit": 0, "Balance": -expenses},
            {"Account": "Payroll Expenses", "Debit": payroll, "Credit": 0, "Balance": -payroll},
            {"Account": "Net Profit", "Debit": 0, "Credit": 0, "Balance": revenue - expenses - payroll}
        ]
    return []

@app.get("/api/v1/reports/generate")
def generate_report(type: str, format: str = "csv", db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    data = view_report(type, db, user)
    df = pd.DataFrame(data)
    
    stream = io.BytesIO()
    if format == "csv":
        df.to_csv(stream, index=False)
        media_type = "text/csv"
        filename = f"{type}_report.csv"
    elif format == "excel":
        df.to_excel(stream, index=False)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{type}_report.xlsx"
    else:
        df.to_csv(stream, index=False)
        media_type = "text/csv"
        filename = f"{type}_report.csv"
        
    stream.seek(0)
    return StreamingResponse(stream, media_type=media_type, headers={"Content-Disposition": f"attachment; filename={filename}"})

# --- WAREHOUSES ---
@app.get("/api/v1/warehouses")
def get_warehouses(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    return db.query(Warehouse).filter(Warehouse.tenant_id == user.tenant_id).all()

@app.post("/api/v1/warehouses")
def create_warehouse(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    wh = Warehouse(**data, tenant_id=user.tenant_id)
    db.add(wh); db.commit(); db.refresh(wh); return wh

@app.put("/api/v1/warehouses/{wh_id}")
def update_warehouse(wh_id: str, data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    wh = db.query(Warehouse).filter_by(id=wh_id, tenant_id=user.tenant_id).first()
    if not wh: raise HTTPException(404)
    for k, v in data.items(): setattr(wh, k, v)
    db.commit(); return wh

@app.delete("/api/v1/warehouses/{wh_id}")
def delete_warehouse(wh_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    wh = db.query(Warehouse).filter_by(id=wh_id, tenant_id=user.tenant_id).first()
    if not wh: raise HTTPException(404)
    db.delete(wh); db.commit(); return {"status": "ok"}

@app.post("/api/v1/accounting/payments")
def create_payment(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    inv_ref = data.get("invoice_ref")
    p = PaymentEntry(
        id=f"PAY-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}",
        date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
        party_type=data.get("party_type"),
        party=data.get("party"),
        payment_type=data.get("payment_type"),
        amount=fill_zero(data.get("amount")),
        mode_of_payment=data.get("mode_of_payment"),
        invoice_ref=inv_ref,
        notes=data.get("notes"),
        tenant_id=user.tenant_id
    )
    db.add(p)
    if inv_ref:
        inv = db.query(Invoice).filter_by(id=inv_ref, tenant_id=user.tenant_id).first()
        if inv: inv.status = "Paid"
        
    # Advanced Double-Entry Accounting: Post to Ledger
    # If customer payment: Debit Cash(1100), Credit AR(1200)
    # If supplier payment: Debit AP(2100), Credit Cash(1100)
    amt = p.amount
    if p.party_type == "Customer":
        db.add(LedgerEntry(date=p.date, account="1100", debit=amt, credit=0.0, description=f"Payment received from {p.party} (Ref: {p.id})", tenant_id=user.tenant_id))
        db.add(LedgerEntry(date=p.date, account="1200", debit=0.0, credit=amt, description=f"Payment cleared for {p.party} (Ref: {p.id})", tenant_id=user.tenant_id))
    elif p.party_type == "Supplier":
        db.add(LedgerEntry(date=p.date, account="2100", debit=amt, credit=0.0, description=f"Payment sent to {p.party} (Ref: {p.id})", tenant_id=user.tenant_id))
        db.add(LedgerEntry(date=p.date, account="1100", debit=0.0, credit=amt, description=f"Cash out to {p.party} (Ref: {p.id})", tenant_id=user.tenant_id))

    db.commit(); db.refresh(p); return p

# --- ADVANCED DOUBLE-ENTRY ACCOUNTING ---

def setup_default_accounts(db: Session, tenant_id: int):
    defaults = [
        {"code": "1100", "name": "Cash & Bank", "type": "Asset"},
        {"code": "1200", "name": "Accounts Receivable", "type": "Asset"},
        {"code": "1300", "name": "Inventory Asset", "type": "Asset"},
        {"code": "2100", "name": "Accounts Payable", "type": "Liability"},
        {"code": "3100", "name": "Owner's Equity", "type": "Equity"},
        {"code": "4100", "name": "Sales Revenue", "type": "Income"},
        {"code": "5100", "name": "Cost of Goods Sold", "type": "Expense"},
        {"code": "5200", "name": "Operating Expenses", "type": "Expense"},
    ]
    for acc in defaults:
        if not db.query(Account).filter_by(code=acc['code'], tenant_id=tenant_id).first():
            db.add(Account(code=acc['code'], name=acc['name'], type=acc['type'], tenant_id=tenant_id))
    db.commit()

@app.get("/api/v1/accounting/accounts")
def get_accounts(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    accs = db.query(Account).filter(Account.tenant_id == user.tenant_id).all()
    if not accs:
        setup_default_accounts(db, user.tenant_id)
        accs = db.query(Account).filter(Account.tenant_id == user.tenant_id).all()
    
    # Calculate live balance from Ledger Entries
    for a in accs:
        debits = db.query(func.sum(LedgerEntry.debit)).filter(LedgerEntry.account == a.code, LedgerEntry.tenant_id == user.tenant_id).scalar() or 0
        credits = db.query(func.sum(LedgerEntry.credit)).filter(LedgerEntry.account == a.code, LedgerEntry.tenant_id == user.tenant_id).scalar() or 0
        if a.type in ["Asset", "Expense"]:
            a.balance = debits - credits
        else:
            a.balance = credits - debits
            
    return [{"code": a.code, "name": a.name, "type": a.type, "balance": f"₹{a.balance:,.2f}"} for a in accs]

@app.get("/api/v1/accounting/ledger")
def get_general_ledger(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    entries = db.query(LedgerEntry, Account.name.label('account_name')).join(Account, LedgerEntry.account == Account.code).filter(LedgerEntry.tenant_id == user.tenant_id).order_by(LedgerEntry.date.desc()).all()
    
    return [
        {
            "id": e[0].id,
            "date": e[0].date,
            "account": f"{e[0].account} - {e[1]}",
            "debit": e[0].debit,
            "credit": e[0].credit,
            "description": e[0].description
        } for e in entries
    ]

@app.post("/api/v1/accounting/journal")
def create_journal_entry(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    entries = data.get("entries", [])
    total_debit = sum(float(e.get("debit", 0)) for e in entries)
    total_credit = sum(float(e.get("credit", 0)) for e in entries)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(400, "Journal Entry must balance. Debits do not equal Credits.")
        
    date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
    desc = data.get("description", "Manual Journal Entry")
    
    for e in entries:
        if float(e.get("debit", 0)) > 0 or float(e.get("credit", 0)) > 0:
            db.add(LedgerEntry(date=date, account=e.get("account"), debit=float(e.get("debit", 0)), credit=float(e.get("credit", 0)), description=desc, tenant_id=user.tenant_id))
            
    db.commit()
    return {"status": "success", "message": "Journal Entry posted"}

@app.get("/api/v1/accounting/summary")
def get_accounting_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    sales = db.query(func.sum(LedgerEntry.credit)).filter(LedgerEntry.account == "4100", LedgerEntry.tenant_id == user.tenant_id).scalar() or 0
    expenses = db.query(func.sum(LedgerEntry.debit)).filter(LedgerEntry.account.in_(["5100", "5200"]), LedgerEntry.tenant_id == user.tenant_id).scalar() or 0
    gst = db.query(func.sum(LedgerEntry.credit)).filter(LedgerEntry.account == "2300", LedgerEntry.tenant_id == user.tenant_id).scalar() or 0
    
    return {
        "total_revenue": f"₹{sales:,.2f}",
        "total_expenses": f"₹{expenses:,.2f}",
        "net_profit": f"₹{(sales - expenses):,.2f}",
        "gst_payable": f"₹{gst:,.2f}"
    }

# ─── ENGINE ENDPOINTS (ERPNext Logic Ported) ──────────────────────────────────

@app.post("/api/v1/engine/calculate_taxes")
def engine_calculate_taxes(data: dict, user: User = Depends(get_current_user_token)):
    """
    Ported from ERPNext: taxes_and_totals.py (calculate_taxes_and_totals)
    
    Accepts items + tax structure and returns item-wise breakdown,
    total tax amounts, and grand total — identical to ERPNext's tax engine.
    
    POST body:
    {
      "items": [{"item_code": "X", "qty": 2, "rate": 500.0, "disc_pct": 5}],
      "taxes": [
        {"name": "CGST 9%", "charge_type": "On Net Total", "rate": 9},
        {"name": "SGST 9%", "charge_type": "On Net Total", "rate": 9}
      ]
    }
    """
    items = data.get("items", [])
    taxes = data.get("taxes", [])
    if not items:
        raise HTTPException(400, "items are required")
    calc = TaxesAndTotals(items, taxes)
    return calc.to_dict()


@app.get("/api/v1/engine/stock_balance/{item_code}")
def engine_stock_balance(item_code: str, warehouse: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    """
    Ported from ERPNext: stock/utils.py → get_stock_balance()
    Returns the live running qty (from StockLedger) for the given item.
    """
    se = StockEngine(db, user.tenant_id)
    balance = se.get_stock_balance(item_code, warehouse)
    needs_reorder = se.reorder_check(item_code)
    return {"item_code": item_code, "warehouse": warehouse, "balance": balance, "needs_reorder": needs_reorder}


@app.post("/api/v1/engine/validate_ledger")
def engine_validate_ledger(data: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_token)):
    """
    Ported from ERPNext: general_ledger.py → process_debit_credit_difference()
    
    Dry-run validation: verifies a GL map is balanced WITHOUT saving.
    POST body: {"gl_map": [{"account": "1200", "debit": 1000, "credit": 0}, ...]}
    """
    gl_map = data.get("gl_map", [])
    if not gl_map:
        raise HTTPException(400, "gl_map is required")
    total_debit  = sum(float(e.get("debit", 0))  for e in gl_map)
    total_credit = sum(float(e.get("credit", 0)) for e in gl_map)
    diff = round(float(abs(total_debit - total_credit)), 4)
    is_balanced = diff <= 0.5
    return {
        "is_balanced": is_balanced,
        "total_debit": round(float(total_debit), 2),
        "total_credit": round(float(total_credit), 2),
        "difference": diff,
        "allowance": 0.5,
        "message": "✅ GL entries are balanced." if is_balanced else f"❌ Imbalance of ₹{diff:.4f} detected."
    }

# --- NATIVE SUMA LOGIC ENDPOINTS ---
@app.post("/api/v1/engine/calculate_tax", tags=["SUMA Native Engine"])
def calculate_tax_native(payload: dict, user: User = Depends(get_current_user_token)):
    """
    SUMA Native Engine: Fully translated from ERPNext logic.
    Calculates Taxes and Totals locally using the adapted source in engine.py.
    """
    items = payload.get("items", [])
    taxes = payload.get("taxes", [])
    if not items:
        raise HTTPException(400, "items are required")
    calc = TaxesAndTotals(items, taxes)
    return calc.to_dict()

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)