import os
import json
from .registry import DocRegistry
from .meta import DocTypeMetadata
from app.modules.crm.models import Customer, Lead
from app.modules.stock.models import Product, Warehouse
from app.modules.sales.invoice import SalesInvoice
from app.modules.sales.models import Quotation, SalesOrder
from app.modules.hr.models import Employee, Attendance, SalarySlip
from app.modules.buying.models import Supplier, PurchaseOrder, PurchaseReceipt
from app.modules.manufacturing.models import BOM, WorkOrder

def load_meta(doctype: str) -> DocTypeMetadata:
    """Attempt to load formal JSON metadata for a DocType."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    meta_path = os.path.join(base_dir, "meta", f"{doctype.lower().replace(' ', '_')}.json")
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as f:
            data = json.load(f)
            return DocTypeMetadata(**data)
    return None

def register_with_meta(name: str, model_cls):
    """Register DocType and automatically side-load metadata if present."""
    DocRegistry.register(name, model_cls, load_meta(name))

def initialize_registry():
    """Initializes the DocRegistry with all system DocTypes and formal Metadata."""
    # CRM
    register_with_meta("Customer", Customer)
    register_with_meta("Lead", Lead)
    
    # Stock
    register_with_meta("Product", Product)
    register_with_meta("Warehouse", Warehouse)
    
    # Sales
    register_with_meta("Sales Invoice", SalesInvoice)
    register_with_meta("Quotation", Quotation)
    register_with_meta("Sales Order", SalesOrder)
    
    # HR
    register_with_meta("Employee", Employee)
    register_with_meta("Attendance", Attendance)
    register_with_meta("Salary Slip", SalarySlip)
    
    # Buying
    register_with_meta("Supplier", Supplier)
    register_with_meta("Purchase Order", PurchaseOrder)
    register_with_meta("Purchase Receipt", PurchaseReceipt)
    
    # Manufacturing
    register_with_meta("BOM", BOM)
    register_with_meta("Work Order", WorkOrder)
    
    # Accounting
    from app.modules.accounting.models import Account, PaymentEntry
    register_with_meta("Account", Account)
    register_with_meta("Payment Entry", PaymentEntry)

    
    print("DocRegistry fully initialized with formal JSON metadata where available.")
