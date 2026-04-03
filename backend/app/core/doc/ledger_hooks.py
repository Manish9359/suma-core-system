
from sqlalchemy.orm import Session
from app.models import LedgerEntry, StockLedger, Account, Bin, Product
from .base import BaseDocument
from sqlalchemy import func

def validate_gl_balancing(db: Session, voucher_type: str, voucher_no: str, tenant_id: int):
    """Point 4 logic: Ensure every transaction follows the Double Entry rule (Debit = Credit)."""
    totals = db.query(
        func.sum(LedgerEntry.debit).label("total_debit"),
        func.sum(LedgerEntry.credit).label("total_credit")
    ).filter_by(
        voucher_type=voucher_type, 
        voucher_no=voucher_no, 
        tenant_id=tenant_id
    ).first()
    
    debit = totals.total_debit or 0
    credit = totals.total_credit or 0
    
    if abs(debit - credit) > 0.01:
        raise ValueError(f"Accounting Error: Transaction {voucher_no} is not balanced! (Debit: {debit}, Credit: {credit})")
    
    print(f"✅ Double-entry verified for {voucher_no}")

def update_account_balances(db: Session, voucher_type: str, voucher_no: str, tenant_id: int):
    """Point 4 logic: Final destination of entries is updating the Account summary."""
    entries = db.query(LedgerEntry).filter_by(
        voucher_type=voucher_type, 
        voucher_no=voucher_no, 
        tenant_id=tenant_id
    ).all()
    
    for entry in entries:
        acc = db.query(Account).filter_by(code=entry.account, tenant_id=tenant_id).first()
        if acc:
            change = (entry.debit or 0) - (entry.credit or 0)
            if acc.type in ["Income", "Liability", "Equity"]:
                change = -change
            acc.balance = (acc.balance or 0) + change
    
    print(f"✅ Real-time Account balances updated for {voucher_no}")

def post_sales_invoice_to_gl(doc: BaseDocument, db: Session, tenant_id: int):
    """
    Automated accounting logic (Point 4):
    Debit: Customer Account (Receivable)
    Credit: Sales Income Account
    """
    grand_total = doc.get("grand_total") or 0
    customer = doc.get("customer") or "Unknown"
    
    # 1. Debit Entry
    debit_entry = LedgerEntry(
        account="Trade Receivable", # Using formal codes
        date=doc.get("date"),
        voucher_type="Sales Invoice",
        voucher_no=doc.name,
        debit=grand_total,
        credit=0.0,
        description=f"Sale to {customer}",
        tenant_id=tenant_id
    )
    db.add(debit_entry)
    
    # 2. Credit Entry
    credit_entry = LedgerEntry(
        account="Sales Income",
        date=doc.get("date"),
        voucher_type="Sales Invoice",
        voucher_no=doc.name,
        debit=0.0,
        credit=grand_total,
        description=f"Sale to {customer}",
        tenant_id=tenant_id
    )
    db.add(credit_entry)
    
    # 3. Optional: Update Stock (Point 3 logic)
    if doc.get("update_stock"):
        items = doc.get("items") or []
        warehouse = doc.get("warehouse")
        for item in items:
            sle = StockLedger(
                item_code=item.get("item_code"),
                warehouse=warehouse,
                voucher_type="Sales Invoice",
                voucher_no=doc.name,
                qty=-(item.get("qty") or 0),
                tenant_id=tenant_id
            )
            db.add(sle)
            update_bin(db, sle.item_code, sle.warehouse, sle.qty, tenant_id)
            print(f"📦 Stock reduction (Update Stock): {item.get('item_code')} (-{item.get('qty')}) in {warehouse}")
    
    db.flush() # Flush to ensure entries exist for validation
    
    validate_gl_balancing(db, "Sales Invoice", doc.name, tenant_id)
    update_account_balances(db, "Sales Invoice", doc.name, tenant_id)
    
    print(f"💰 Account POST: Invoice {doc.name} posted and verified.")

def post_delivery_note_to_stock(doc: BaseDocument, db: Session, tenant_id: int):
    """
    Automated inventory logic:
    Stock Ledger Entry for every item in the delivery note.
    """
    items = doc.get("items") or []
    warehouse = doc.get("warehouse")
    
    for item in items:
        sle = StockLedger(
            item_code=item.get("item_code"),
            warehouse=warehouse,
            voucher_type="Delivery Note",
            voucher_no=doc.name,
            qty=-(item.get("qty") or 0), # Redux stock
            tenant_id=tenant_id
        )
        db.add(sle)
        update_bin(db, sle.item_code, sle.warehouse, sle.qty, tenant_id)
        print(f"Post Stock: {item.get('item_code')} reduced by {item.get('qty')} in {warehouse}")

def post_work_order_to_stock(doc: BaseDocument, db: Session, tenant_id: int):
    """Manufacturing logic (Point 6): Consume Raw Materials and Produce Finished Good."""
    bom_id = doc.get("bom_no")
    from app.core.doc.registry import DocRegistry
    bom = db.query(DocRegistry.get_class("BOM")).filter_by(id=bom_id, tenant_id=tenant_id).first()
    
    if not bom:
         raise ValueError(f"BOM {bom_id} not found for Work Order processing.")
         
    qty_to_make = doc.get("qty") or 1
    fg_item = doc.get("production_item")
    fg_wh = doc.get("fg_warehouse")
    
    # 1. Consume Raw Materials (Decrease Stock)
    for rm in bom.get("items") or []:
        needed_qty = (rm.get("qty") or 0) * qty_to_make
        sle = StockLedger(
            item_code=rm.get("item_code"),
            warehouse=fg_wh, # Simple: use same warehouse for now
            voucher_type="Work Order",
            voucher_no=doc.name,
            qty=-needed_qty,
            tenant_id=tenant_id
        )
        db.add(sle)
        update_bin(db, sle.item_code, sle.warehouse, sle.qty, tenant_id)
        print(f"🏭 RM Consumed: {rm.get('item_code')} (-{needed_qty})")
        
    # 2. Produce Finished Good (Increase Stock)
    sle_fg = StockLedger(
        item_code=fg_item,
        warehouse=fg_wh,
        voucher_type="Work Order",
        voucher_no=doc.name,
        qty=qty_to_make,
        tenant_id=tenant_id
    )
    db.add(sle_fg)
    update_bin(db, sle_fg.item_code, sle_fg.warehouse, sle_fg.qty, tenant_id)
    print(f"🏗️ FG Produced: {fg_item} (+{qty_to_make})")

def post_purchase_receipt_to_stock(doc: BaseDocument, db: Session, tenant_id: int):
    """Purchase logic (Point 8): Increase stock on receiving materials."""
    items = doc.get("items") or []
    warehouse = doc.get("warehouse")
    
    for item in items:
        # Point 57 logic: Moving Average Valuation
        from app.models import Product
        prod = db.query(Product).filter_by(sku=item.get("item_code"), tenant_id=tenant_id).first()
        if prod:
            old_qty = prod.stock or 0
            old_val = prod.cost or 0 # assuming cost stores valuation_rate
            new_qty = item.get("qty") or 0
            new_rate = item.get("rate") or 0
            
            if (old_qty + new_qty) > 0:
                new_val = ((old_qty * old_val) + (new_qty * new_rate)) / (old_qty + new_qty)
                prod.cost = round(new_val, 4)
                prod.stock = old_qty + new_qty # Update stock count in Product table too
                
        sle = StockLedger(
            item_code=item.get("item_code"),
            warehouse=warehouse,
            voucher_type="Purchase Receipt",
            voucher_no=doc.name,
            qty=item.get("qty") or 0, # Increase stock
            tenant_id=tenant_id
        )
        db.add(sle)
        update_bin(db, sle.item_code, sle.warehouse, sle.qty, tenant_id)
        print(f"📥 Stock IN: {item.get('item_code')} increased by {item.get('qty')} (Valuation Updated)")

def post_purchase_invoice_to_gl(doc: BaseDocument, db: Session, tenant_id: int):
    """Purchase logic (Point 8): Accounting entries for purchase."""
    grand_total = doc.get("grand_total") or 0
    vendor = doc.get("vendor") or "Unknown"
    
    # 1. Debit Entry (Stock/Expense Assets)
    debit_entry = LedgerEntry(
        account="Stock Assets",
        date=doc.get("date"),
        voucher_type="Purchase Invoice",
        voucher_no=doc.name,
        debit=grand_total,
        credit=0.0,
        description=f"Purchase from {vendor}",
        tenant_id=tenant_id
    )
    db.add(debit_entry)
    
    # 2. Credit Entry (Accounts Payable)
    credit_entry = LedgerEntry(
        account="Trade Payable",
        date=doc.get("date"),
        voucher_type="Purchase Invoice",
        voucher_no=doc.name,
        debit=0.0,
        credit=grand_total,
        description=f"Purchase from {vendor}",
        tenant_id=tenant_id
    )
    db.add(credit_entry)
    
    db.flush()
    validate_gl_balancing(db, "Purchase Invoice", doc.name, tenant_id)
    update_account_balances(db, "Purchase Invoice", doc.name, tenant_id)
    
    print(f"💸 Purchase POST: Invoice {doc.name} posted and verified.")

def post_salary_slip_to_gl(doc: BaseDocument, db: Session, tenant_id: int):
    """Payroll logic (Point 9): Accounting entries for salary."""
    net_pay = doc.get("net_pay") or 0
    emp_name = doc.get("employee_name") or "Employee"
    
    # 1. Debit Entry (Salary Expense)
    debit_entry = LedgerEntry(
        account="Salary Expense",
        date=doc.get("posting_date"),
        voucher_type="Salary Slip",
        voucher_no=doc.name,
        debit=net_pay,
        credit=0.0,
        description=f"Salary for {emp_name}",
        tenant_id=tenant_id
    )
    db.add(debit_entry)
    
    # 2. Credit Entry (Bank/Payable)
    credit_entry = LedgerEntry(
        account="Cash / Bank",
        date=doc.get("posting_date"),
        voucher_type="Salary Slip",
        voucher_no=doc.name,
        debit=0.0,
        credit=net_pay,
        description=f"Salary for {emp_name}",
        tenant_id=tenant_id
    )
    db.add(credit_entry)
    
    db.flush()
    validate_gl_balancing(db, "Salary Slip", doc.name, tenant_id)
    update_account_balances(db, "Salary Slip", doc.name, tenant_id)
    
    print(f"💼 Payroll POST: {emp_name} salary posted.")

def post_sales_order_to_stock(doc: BaseDocument, db: Session, tenant_id: int):
    """Sales Pipeline: Reserve stock on Sales Order submission."""
    items = doc.get("items") or []
    warehouse = doc.get("warehouse")
    
    for item in items:
        update_bin(db, item.get("item_code"), warehouse, 0, tenant_id, reserved_qty=item.get("qty") or 0)
        print(f"📦 Stock Reserved: {item.get('item_code')} (Qty: {item.get('qty')}) for Sales Order {doc.name}.")

def update_bin(db: Session, item_code: str, warehouse: str, qty_change: float, tenant_id: int, reserved_qty: float = 0):
    """Core logic to maintain live Warehouse-wise balances (Bin table)."""
    if not warehouse or not item_code: return
    
    bin_record = db.query(Bin).filter_by(item_code=item_code, warehouse=warehouse, tenant_id=tenant_id).first()
    if not bin_record:
        bin_record = Bin(item_code=item_code, warehouse=warehouse, actual_qty=0, reserved_qty=0, tenant_id=tenant_id)
        db.add(bin_record)
    
    bin_record.actual_qty += qty_change
    bin_record.reserved_qty += reserved_qty
    bin_record.projected_qty = bin_record.actual_qty - bin_record.reserved_qty
    
    if bin_record.actual_qty < 0:
        raise ValueError(f"Insufficient stock for Product '{item_code}' in Warehouse '{warehouse}'. Physical balance cannot be negative. Required: {abs(qty_change)}, Available: {bin_record.actual_qty - qty_change}")
    
    db.flush() # Ensure this bin change is visible to the sum query below
    
    # Also sync to Product table (if it's the primary warehouse)
    prod = db.query(Product).filter_by(sku=item_code, tenant_id=tenant_id).first()
    if prod:
        # Sum total stock across ALL warehouses for the Product global count
        total = db.query(func.sum(Bin.actual_qty)).filter_by(item_code=item_code, tenant_id=tenant_id).scalar() or 0
        prod.stock = total

def post_stock_entry_to_stock(doc: BaseDocument, db: Session, tenant_id: int):
    """Processes manual Stock Entries to increment or decrement Warehouse Bins (Manual adjustment module)."""
    purpose = doc.get("purpose")
    items = doc.get("items") or []
    
    for item in items:
        item_code = item.get("item_code")
        qty = item.get("qty") or 0
        if not item_code or qty <= 0: continue
        
        s_warehouse = item.get("s_warehouse")
        t_warehouse = item.get("t_warehouse")
        
        if purpose in ["Material Issue", "Material Transfer"] and s_warehouse:
            sle_out = StockLedger(item_code=item_code, warehouse=s_warehouse, voucher_type="Stock Entry", voucher_no=doc.name, qty=-qty, tenant_id=tenant_id)
            db.add(sle_out)
            update_bin(db, item_code, s_warehouse, -qty, tenant_id)
            
        if purpose in ["Material Receipt", "Material Transfer"] and t_warehouse:
            sle_in = StockLedger(item_code=item_code, warehouse=t_warehouse, voucher_type="Stock Entry", voucher_no=doc.name, qty=qty, tenant_id=tenant_id)
            db.add(sle_in)
            update_bin(db, item_code, t_warehouse, qty, tenant_id)
