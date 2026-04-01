from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# --- TENANT & SYSTEM ---
class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    domain = Column(String, nullable=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="Employee") # Admin, Manager, Employee
    status = Column(String, default="Active") # Active, Disabled
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    tenant = relationship("Tenant")
    roles = relationship("Role", secondary="user_roles", back_populates="users")

# --- RBAC (SUMA NATIVE) ---
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("role_id", Integer, ForeignKey("roles.id")),
)

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False) # e.g., 'Accountant', 'Sales Manager'
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", back_populates="role", cascade="all, delete-orphan")

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    doctype = Column(String) # e.g. "Sales Invoice"
    can_read = Column(Boolean, default=True)
    can_write = Column(Boolean, default=False)
    can_create = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_submit = Column(Boolean, default=False)
    can_cancel = Column(Boolean, default=False)
    # Field-level restriction (comma separated json string for simplicity)
    restricted_fields = Column(String, default="[]") 
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    role = relationship("Role", back_populates="permissions")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(String)
    type = Column(String) # Success, Warning, Error, Info
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class WorkflowSignature(Base):
    __tablename__ = "workflow_signatures"
    id = Column(Integer, primary_key=True, autoincrement=True)
    doctype = Column(String) # Sales Invoice, Purchase Order, etc.
    docname = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String)
    action = Column(String) # Approve, Reject
    comment = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- CUSTOMIZATION (DocType/Custom Fields) ---
class CustomField(Base):
    __tablename__ = "custom_fields"
    id = Column(Integer, primary_key=True)
    module = Column(String, nullable=False) # e.g., 'Customer', 'Product'
    fieldname = Column(String, nullable=False)
    label = Column(String, nullable=False)
    fieldtype = Column(String, default="Data") # Data, Select, Date, Check
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- CRM ---
class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String)
    company = Column(String)
    phone = Column(String)
    email = Column(String)
    source = Column(String)
    status = Column(String, default="New")
    custom_data = Column(JSON, default={})
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class Customer(Base):
    __tablename__ = "customers"
    id = Column(String, primary_key=True) # CUST-0001
    company = Column(String, nullable=False)
    contact = Column(String)
    address = Column(String)
    gst = Column(String)
    notes = Column(Text)
    custom_data = Column(JSON, default={})
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class Opportunity(Base):
    __tablename__ = "opportunities"
    id = Column(String, primary_key=True) # OPP-2026-0001
    customer = Column(String)
    contact = Column(String)
    status = Column(String, default="Open") # Open, Quotation Sent, Won, Lost
    value = Column(Float, default=0.0)
    source = Column(String)
    expected_closing = Column(String)
    custom_data = Column(JSON, default={})
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- INVENTORY & PRODUCTS ---
class Product(Base):
    __tablename__ = "products"
    sku = Column(String, primary_key=True) # ITEM-0001
    name = Column(String, nullable=False)
    brand = Column(String)
    category = Column(String)
    cost = Column(Float, default=0.0)
    sell = Column(Float, default=0.0)
    stock = Column(Integer, default=0)
    warehouse = Column(String)
    low = Column(Boolean, default=False)
    custom_data = Column(JSON, default={})
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- SALES & ACCOUNTING ---
class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(String, primary_key=True) # INV-2026-001
    customer = Column(String)
    date = Column(String)
    amount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)
    status = Column(String, default="Draft") # Draft, Submitted, Paid, Overdue
    workflow_state = Column(String, default="Draft") # Draft, Pending Approval, Approved
    custom_data = Column(JSON, default={})
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    id = Column(Integer, primary_key=True)
    invoice_id = Column(String, ForeignKey("invoices.id"))
    item_code = Column(String, ForeignKey("products.sku"))
    qty = Column(Integer, default=1)
    rate = Column(Float, default=0.0)
    disc_pct = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)

class Account(Base):
    __tablename__ = "accounts"
    code = Column(String, primary_key=True)
    name = Column(String)
    type = Column(String) # Asset, Liability, Equity, Income, Expense
    parent_id = Column(String, ForeignKey("accounts.code"), nullable=True) # For hierarchy
    is_group = Column(Boolean, default=False) # Group accounts sum up their children
    balance = Column(Float, default=0.0)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(String)
    account = Column(String, ForeignKey("accounts.code"))
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    description = Column(String)
    voucher_type = Column(String) 
    voucher_no = Column(String)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- PROCUREMENT ---
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(String, primary_key=True)
    vendor = Column(String)
    date = Column(String)
    items = Column(Integer)
    total = Column(Float, default=0.0)
    status = Column(String, default="Draft")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(Integer, primary_key=True)
    parent_id = Column(String, ForeignKey("purchase_orders.id"))
    item_code = Column(String, ForeignKey("products.sku"))
    qty = Column(Float)
    rate = Column(Float)

# --- HR ---
class Employee(Base):
    __tablename__ = "employees"
    id = Column(String, primary_key=True)
    name = Column(String)
    role = Column(String)
    dept = Column(String)
    salary = Column(Float, default=0.0)
    joining = Column(String)
    status = Column(String, default="Active")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"))
    date = Column(String)
    status = Column(String) # Present, Absent, Half Day
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class SalarySlip(Base):
    __tablename__ = "salary_slips"
    id = Column(String, primary_key=True)
    employee_id = Column(String, ForeignKey("employees.id"))
    start_date = Column(String)
    end_date = Column(String)
    gross_pay = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    net_pay = Column(Float, default=0.0)
    status = Column(String, default="Draft") # Draft, Submitted, Paid
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- WORKFLOW & DOC STATUS ---
class WorkflowTask(Base):
    __tablename__ = "workflow_tasks"
    id = Column(Integer, primary_key=True)
    doc_type = Column(String)
    doc_id = Column(String)
    action_required_by = Column(String) # Role e.g., 'Manager'
    status = Column(String, default="Pending") # Pending, Approved, Rejected
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- COMPANY SETTINGS ---
class CompanySettings(Base):
    __tablename__ = "company_settings"
    id = Column(Integer, primary_key=True)
    company_name = Column(String, default="My Company")
    gstin = Column(String, default="")
    address = Column(String, default="")
    phone = Column(String, default="")
    email = Column(String, default="")
    bank_name = Column(String, default="")
    bank_account = Column(String, default="")
    bank_ifsc = Column(String, default="")
    bank_branch = Column(String, default="")
    terms = Column(Text, default="Payment terms – 100% Advanced.\nDelivery time – 7 to 10 Days.\nGoods once sold will not be taken back.\nSubject to Pune jurisdiction only.")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- QUOTATIONS ---
class Quotation(Base):
    __tablename__ = "quotations"
    id = Column(String, primary_key=True)
    customer = Column(String)
    date = Column(String)
    valid_till = Column(String)
    amount = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)
    status = Column(String, default="Draft")
    custom_data = Column(JSON, default={})
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class QuotationItem(Base):
    __tablename__ = "quotation_items"
    id = Column(Integer, primary_key=True)
    quotation_id = Column(String, ForeignKey("quotations.id"))
    item_code = Column(String, ForeignKey("products.sku"))
    qty = Column(Integer, default=1)
    rate = Column(Float, default=0.0)
    disc_pct = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)

# --- WAREHOUSES & STOCK LEDGER ---
class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class StockLedger(Base):
    __tablename__ = "stock_ledger"
    id = Column(Integer, primary_key=True)
    item_code = Column(String, ForeignKey("products.sku"))
    warehouse = Column(String, ForeignKey("warehouses.id"))
    qty = Column(Float) # positive for inward, negative for outward
    voucher_type = Column(String) # Invoice, Purchase Receipt, Stock Entry
    voucher_no = Column(String)
    valuation_rate = Column(Float, default=0.0)
    date = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class Bin(Base):
    __tablename__ = "bins"
    id = Column(Integer, primary_key=True)
    item_code = Column(String, ForeignKey("products.sku"))
    warehouse = Column(String, ForeignKey("warehouses.id"))
    actual_qty = Column(Float, default=0.0)    # physical stock
    reserved_qty = Column(Float, default=0.0)  # from SO, not yet delivered
    projected_qty = Column(Float, default=0.0) # (Actual + Inward) - Outward
    valuation_rate = Column(Float, default=0.0)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class StockEntry(Base):
    __tablename__ = "stock_entries"
    id = Column(String, primary_key=True) # SE-0001
    purpose = Column(String) # Material Receipt, Material Issue, Material Transfer
    date = Column(String)
    total_qty = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(String, default="Draft") # Draft, Submitted
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class StockEntryItem(Base):
    __tablename__ = "stock_entry_items"
    id = Column(Integer, primary_key=True)
    parent_id = Column(String, ForeignKey("stock_entries.id"))
    item_code = Column(String, ForeignKey("products.sku"))
    qty = Column(Float)
    s_warehouse = Column(String, ForeignKey("warehouses.id")) # source
    t_warehouse = Column(String, ForeignKey("warehouses.id")) # target
    rate = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)

# --- SUPPLIERS ---
class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(String, primary_key=True) # SUPP-0001
    name = Column(String, nullable=False)
    contact = Column(String)
    address = Column(String)
    category = Column(String)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- PROJECTS ---
class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, default="Open") # Open, Completed, Cancelled
    customer = Column(String, ForeignKey("customers.id"))
    start_date = Column(String)
    end_date = Column(String)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    title = Column(String, nullable=False)
    status = Column(String, default="Todo")
    assigned_to = Column(String, ForeignKey("employees.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class Issue(Base):
    __tablename__ = "issues"
    id = Column(String, primary_key=True)
    customer = Column(String, ForeignKey("customers.id"))
    subject = Column(String, nullable=False)
    description = Column(Text)
    priority = Column(String, default="Medium") # Low, Medium, High, Urgent
    status = Column(String, default="Open") # Open, Closed, On Hold
    opening_date = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

# --- EXPANDED SALES ---
class SalesOrder(Base):
    __tablename__ = "sales_orders"
    id = Column(String, primary_key=True) # SO-2026-0001
    customer = Column(String, ForeignKey("customers.id"))
    date = Column(String)
    total = Column(Float, default=0.0)
    status = Column(String, default="Draft") # Draft, Submitted, Completed
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"
    id = Column(Integer, primary_key=True)
    parent_id = Column(String, ForeignKey("sales_orders.id"))
    item_code = Column(String, ForeignKey("products.sku"))
    qty = Column(Float)
    rate = Column(Float)

# --- EXPANDED PROCUREMENT ---
class PurchaseReceipt(Base):
    __tablename__ = "purchase_receipts"
    id = Column(String, primary_key=True)
    supplier = Column(String, ForeignKey("suppliers.id"))
    date = Column(String)
    status = Column(String, default="Draft")
    workflow_state = Column(String, default="Draft")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class PurchaseReceiptItem(Base):
    __tablename__ = "purchase_receipt_items"
    id = Column(Integer, primary_key=True)
    parent_id = Column(String, ForeignKey("purchase_receipts.id"))
    item_code = Column(String, ForeignKey("products.sku"))
    qty = Column(Float)
    warehouse = Column(String, ForeignKey("warehouses.id"))

class PurchaseInvoiceModel(Base):
    __tablename__ = "purchase_invoices"
    id = Column(String, primary_key=True)
    supplier = Column(String, ForeignKey("suppliers.id"))
    date = Column(String)
    amount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    gst_rate = Column(Float, default=18.0)
    grand_total = Column(Float, default=0.0)
    purchase_order = Column(String, nullable=True)
    status = Column(String, default="Draft")
    workflow_state = Column(String, default="Draft")
    custom_data = Column(JSON, default={})
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class MaterialRequest(Base):
    __tablename__ = "material_requests"
    id = Column(String, primary_key=True)
    date = Column(String)
    type = Column(String) # Purchase, Transfer, Manufacture
    status = Column(String, default="Draft")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class MaterialRequestItem(Base):
    __tablename__ = "material_request_items"
    id = Column(Integer, primary_key=True)
    parent_id = Column(String, ForeignKey("material_requests.id"))
    item_code = Column(String, ForeignKey("products.sku"))
    qty = Column(Float)

# --- MANUFACTURING ---
class BOM(Base):
    __tablename__ = "bills_of_materials"
    id = Column(String, primary_key=True) # BOM-ITEM-001
    item_code = Column(String, ForeignKey("products.sku"))
    qty = Column(Float, default=1.0)
    total_cost = Column(Float, default=0.0)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class BOMItem(Base):
    __tablename__ = "bom_items"
    id = Column(Integer, primary_key=True)
    parent_id = Column(String, ForeignKey("bills_of_materials.id"))
    item_code = Column(String, ForeignKey("products.sku"))
    qty = Column(Float)

# --- EXPANDED ACCOUNTING ---
class PaymentEntry(Base):
    __tablename__ = "payment_entries"
    id = Column(String, primary_key=True) # PAY-2026-0001
    date = Column(String)
    party_type = Column(String) # Customer, Supplier
    party = Column(String)
    payment_type = Column(String) # Receive, Pay
    amount = Column(Float, default=0.0)
    mode_of_payment = Column(String) # Cash, Bank, UPI
    invoice_ref = Column(String, ForeignKey("invoices.id"), nullable=True)
    notes = Column(String, nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class QualityInspection(Base):
    __tablename__ = "quality_inspections"
    id = Column(String, primary_key=True)
    reference_type = Column(String) # Purchase Receipt, Work Order
    reference_no = Column(String)
    item_code = Column(String, ForeignKey("products.sku"))
    status = Column(String) # Passed, Failed
    remarks = Column(Text)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class Asset(Base):
    __tablename__ = "assets"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    purchase_date = Column(String)
    gross_purchase_amount = Column(Float)
    warehouse = Column(String, ForeignKey("warehouses.id"))
    status = Column(String, default="Scrapped")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class AMC(Base):
    __tablename__ = "amc_contracts"
    id = Column(String, primary_key=True) # AMC-0001
    client = Column(String, ForeignKey("customers.id"))
    equipment = Column(String)
    start_date = Column(String)
    end_date = Column(String)
    visits = Column(Integer, default=4)
    status = Column(String, default="Active")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class Installation(Base):
    __tablename__ = "installations"
    id = Column(String, primary_key=True) # INS-0001
    sales_order = Column(String, ForeignKey("sales_orders.id"))
    customer = Column(String, ForeignKey("customers.id"))
    installation_date = Column(String)
    engineer = Column(String, ForeignKey("employees.id"))
    status = Column(String, default="Pending")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    doctype = Column(String)
    docname = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String) # Created, Updated, Deleted, Submitted, Cancelled
    changes = Column(JSON) # {"field": [old_val, new_val]}
    timestamp = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))


class GLEntry(Base):
    __tablename__ = "gl_entries"
    id = Column(Integer, primary_key=True)
    account = Column(String, ForeignKey("accounts.code"))
    posting_date = Column(String)
    voucher_type = Column(String) # Sales Invoice, Payment Entry
    voucher_no = Column(String)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    remarks = Column(Text)
    is_cancelled = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class StockLedgerEntry(Base):
    __tablename__ = "stock_ledger_entries"
    id = Column(Integer, primary_key=True)
    item_code = Column(String, ForeignKey("products.sku"))
    warehouse = Column(String, ForeignKey("warehouses.id"))
    posting_date = Column(String)
    voucher_type = Column(String) # Sales Invoice, Purchase Receipt
    voucher_no = Column(String)
    qty_change = Column(Float) # Negative for sales, positive for purchase
    balance_qty = Column(Float) # Running balance
    valuation_rate = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class Timesheet(Base):
    __tablename__ = "timesheets"
    id = Column(String, primary_key=True)
    employee = Column(String, ForeignKey("employees.id"))
    start_date = Column(String)
    end_date = Column(String)
    total_hours = Column(Float, default=0.0)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

class TimesheetItem(Base):
    __tablename__ = "timesheet_items"
    id = Column(Integer, primary_key=True)
    parent_id = Column(String, ForeignKey("timesheets.id"))
    project = Column(String, ForeignKey("projects.id"))
    task = Column(String)
    hours = Column(Float)
    description = Column(String)

class WebPage(Base):
    __tablename__ = "web_pages"
    id = Column(String, primary_key=True)
    title = Column(String)
    route = Column(String, unique=True)
    content = Column(String)
    is_published = Column(String, default="Published")
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
