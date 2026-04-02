import os
import sys
from datetime import datetime, timedelta
import random

# Ensure we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, get_db
from app.models import (
    Tenant, User, Customer, Product, Warehouse, Invoice, InvoiceItem,
    Lead, Employee, PurchaseOrder, PurchaseOrderItem, StockLedger, Account, LedgerEntry
)

def seed_data():
    db = next(get_db())
    
    tenant = db.query(Tenant).first()
    if not tenant:
        print("No tenant found. Exiting.")
        return
    t_id = tenant.id

    print("Seeding Warehouses...")
    warehouses = [
        Warehouse(id="WH-MAIN", name="Main Warehouse", location="Mumbai H.O.", tenant_id=t_id),
        Warehouse(id="WH-ZONE1", name="Zone 1 Distribution", location="Pune", tenant_id=t_id)
    ]
    for w in warehouses:
        if not db.query(Warehouse).filter_by(id=w.id).first():
            db.add(w)

    print("Seeding Customers & Leads...")
    customers = [
        Customer(id="CUST-0001", company="Acme Corp", contact="John Doe", address="123 Tech Park, Mumbai", gst="27AADCB2230M1Z2", tenant_id=t_id),
        Customer(id="CUST-0002", company="Global Industries", contact="Jane Smith", address="45 Cyber City, Pune", gst="27AAACH7409R1Z8", tenant_id=t_id),
        Customer(id="CUST-0003", company="Nexus Ltd", contact="Robert Brown", address="89 IT Hub, Bangalore", gst="29AABCN6412D1Z4", tenant_id=t_id)
    ]
    for c in customers:
        if not db.query(Customer).filter_by(id=c.id).first():
            db.add(c)

    leads = [
        Lead(id="LEAD-TEMP-1", name="Alice Johnson", company="Startup Inc", phone="9876543210", email="alice@startup.com", source="Website", status="New", tenant_id=t_id),
        Lead(id="LEAD-TEMP-2", name="Michael Clark", company="Retail Solutions", phone="9123456780", email="michael@retail.com", source="Referral", status="Contacted", tenant_id=t_id)
    ]
    for l in leads:
        if not db.query(Lead).filter_by(id=l.id).first():
            db.add(l)

    print("Seeding Products & Inventory...")
    products = []
    categories = ["Smart Switches", "Sensors", "Cameras"]
    stock_bases = [50, 120, 15, 200, 35]
    for i in range(1, 11):
        sku = f"ITEM-{i:04d}"
        cat = random.choice(categories)
        cost = random.randint(1000, 5000)
        sell = int(cost * 1.5)
        stock = random.choice(stock_bases)
        wh = random.choice(["WH-MAIN", "WH-ZONE1"])
        low = stock < 20
        p = Product(sku=sku, name=f"{cat} Pro Series {i}", brand="Iotics", category=cat, cost=cost, sell=sell, stock=stock, warehouse=wh, low=low, tenant_id=t_id)
        if not db.query(Product).filter_by(sku=sku).first():
            db.add(p)
            products.append(p)
            # Add initial stock ledger entry corresponding to this stock
            entry = StockLedger(
                item_code=sku, warehouse=wh, qty=stock, voucher_type="Initial Stock", 
                voucher_no="INIT-001", valuation_rate=cost, tenant_id=t_id
            )
            db.add(entry)

    print("Seeding Employees...")
    employees = [
        Employee(id="EMP-001", name="Sarah Lee", role="Sales Executive", dept="Sales", salary=45000, joining="2024-01-15", status="Active", tenant_id=t_id),
        Employee(id="EMP-002", name="David Kim", role="Technician", dept="Service", salary=35000, joining="2024-03-10", status="Active", tenant_id=t_id),
        Employee(id="EMP-003", name="Emily Chen", role="Accountant", dept="Finance", salary=55000, joining="2023-11-01", status="Active", tenant_id=t_id)
    ]
    for e in employees:
        if not db.query(Employee).filter_by(id=e.id).first():
            db.add(e)

    db.commit()

    print("Seeding Invoices & Accounting...")
    # Seed Accounts
    accounts = [
        Account(code="4100", name="Sales", type="Income", tenant_id=t_id),
        Account(code="1200", name="Accounts Receivable", type="Asset", tenant_id=t_id),
    ]
    for a in accounts:
        if not db.query(Account).filter_by(code=a.code).first():
            db.add(a)
    db.commit()

    # Generate 5 realistic invoices over the last 30 days
    now = datetime.utcnow()
    for i in range(1, 6):
        inv_id = f"INV-2026-{i:03d}"
        if db.query(Invoice).filter_by(id=inv_id).first():
            continue
        
        cust = random.choice(customers)
        inv_date = (now - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")
        
        num_items = random.randint(1, 3)
        inv_items = []
        total = 0.0
        for _ in range(num_items):
            prod = random.choice(products)
            qty = random.randint(1, 5)
            rate = prod.sell
            amount = qty * rate
            total += amount
            inv_items.append(InvoiceItem(invoice_id=inv_id, item_code=prod.sku, qty=qty, rate=rate, amount=amount))
            
            # Deduct stock
            if prod.stock >= qty:
                prod.stock -= qty
                db.add(StockLedger(item_code=prod.sku, warehouse=prod.warehouse, qty=-qty, voucher_type="Sales Invoice", voucher_no=inv_id, tenant_id=t_id))
        
        tax = total * 0.18
        grand = total + tax
        status = random.choice(["Paid", "Paid", "Submitted", "Overdue"])
        
        inv = Invoice(
            id=inv_id, customer=cust.company, date=inv_date, amount=total, tax=tax, 
            grand_total=grand, status=status, workflow_state="Approved", tenant_id=t_id
        )
        db.add(inv)
        for item in inv_items:
            db.add(item)
            
        # Add Ledger Entry for Income
        db.add(LedgerEntry(date=inv_date, account="4100", credit=total, description=f"Sales from {inv_id}", tenant_id=t_id))
        db.add(LedgerEntry(date=inv_date, account="1200", debit=grand, description=f"Receivable from {cust.company}", tenant_id=t_id))
        
    db.commit()
    print("Demo Data Seeded Successfully!")

if __name__ == "__main__":
    seed_data()
