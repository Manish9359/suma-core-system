from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
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
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    tenant = relationship("Tenant")

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
    type = Column(String)
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

