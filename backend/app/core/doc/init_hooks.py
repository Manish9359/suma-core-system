
from .hooks import HookManager
from .ledger_hooks import post_sales_invoice_to_gl, post_delivery_note_to_stock

def init_system_hooks():
    """
    This is the central place to register all 'Point 1: Business Logic' triggers.
    Ensures that when a document is 'Submitted', the rest of the system responds.
    """
    
    # 1. SALES INVOICE -> ACCOUNTING (GL)
    HookManager.register("Sales Invoice", "on_submit", post_sales_invoice_to_gl)
    
    # 2. DELIVERY NOTE -> INVENTORY (STOCK)
    HookManager.register("Delivery Note", "on_submit", post_delivery_note_to_stock)
    
    # 3. WORK ORDER -> MANUFACTURING (STOCK)
    from .ledger_hooks import post_work_order_to_stock
    HookManager.register("Work Order", "on_submit", post_work_order_to_stock)

    # 4. PURCHASE -> PROCUREMENT (STOCK & ACCOUNTING)
    from .ledger_hooks import post_purchase_receipt_to_stock, post_purchase_invoice_to_gl
    HookManager.register("Purchase Receipt", "on_submit", post_purchase_receipt_to_stock)
    HookManager.register("Purchase Invoice", "on_submit", post_purchase_invoice_to_gl)
    
    # 5. HR -> PAYROLL (ACCOUNTING)
    from .ledger_hooks import post_salary_slip_to_gl
    HookManager.register("Salary Slip", "on_submit", post_salary_slip_to_gl)

    # 6. AUTOMATION -> NOTIFICATIONS & RULES (PHASE 8)
    from .notification_hooks import notify_on_submission, check_approval_rules
    for doctype in ["Sales Invoice", "Purchase Order", "Work Order", "Salary Slip"]:
        HookManager.register(doctype, "on_submit", notify_on_submission)
        
    HookManager.register("Purchase Order", "before_save", check_approval_rules)

    print("✅ System hooks initialized (Full automation enabled).")
