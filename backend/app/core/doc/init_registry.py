import os
from .registry import DocRegistry
from .meta import DocTypeMetadata
from app.core.doc.base import BaseDocument
from app.modules.crm.models import Customer, Lead, Opportunity
from app.modules.stock.models import Product, Warehouse
from app.modules.sales.invoice import SalesInvoice
from app.modules.sales.models import Quotation, SalesOrder
from app.modules.hr.models import Employee, Attendance, SalarySlip
from app.modules.buying.models import Supplier, PurchaseOrder, PurchaseReceipt
from app.modules.buying.purchase_invoice import PurchaseInvoice
from app.modules.manufacturing.models import BOM, WorkOrder

def register_with_meta(name: str, model_cls):
    DocRegistry.register(name, model_cls, DocRegistry.load_meta(name))

def init_system_registry():
    # CRM
    register_with_meta("Customer", Customer)
    register_with_meta("Lead", Lead)
    register_with_meta("Opportunity", Opportunity)

    # Stock
    register_with_meta("Product", Product)
    register_with_meta("Warehouse", Warehouse)
    register_with_meta("Bin", BaseDocument)
    register_with_meta("StockLedger", BaseDocument)

    # Sales
    register_with_meta("Sales Invoice", SalesInvoice)
    register_with_meta("Quotation", Quotation)
    register_with_meta("Sales Order", SalesOrder)
    register_with_meta("Sales Invoice Item", BaseDocument)

    # HR
    register_with_meta("Employee", Employee)
    register_with_meta("Attendance", Attendance)
    register_with_meta("Salary Slip", SalarySlip)

    # Buying
    register_with_meta("Supplier", Supplier)
    register_with_meta("Purchase Order", PurchaseOrder)
    register_with_meta("Purchase Receipt", PurchaseReceipt)
    register_with_meta("Purchase Invoice", PurchaseInvoice)
    register_with_meta("Purchase Order Item", BaseDocument)
    register_with_meta("Purchase Receipt Item", BaseDocument)

    # Manufacturing
    register_with_meta("BOM", BOM)
    register_with_meta("Work Order", WorkOrder)
    register_with_meta("BOM Item", BaseDocument)

    # Accounting
    register_with_meta("Account", BaseDocument)
    register_with_meta("Payment Entry", BaseDocument)

    # Projects & Service
    register_with_meta("Project", BaseDocument)
    register_with_meta("System Service", BaseDocument)
    register_with_meta("AMC", BaseDocument)
    register_with_meta("Installation", BaseDocument)

    print("✅ DocRegistry initialized with all DocTypes.")

def initialize_registry():
    """Called from main.py on startup."""
    init_system_registry()
    
    # Initialize hooks
    try:
        from .init_hooks import init_system_hooks
        init_system_hooks()
    except Exception as e:
        print(f"⚠️ Hook init warning: {e}")
