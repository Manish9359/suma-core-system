import random
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import (
    Base, Tenant, User, Customer, Lead, Product, 
    Warehouse, StockLedger, Bin, Supplier, Employee,
    Account, LedgerEntry
)
from app.core.auth.security import hash_password
from app.core.doc.ledger_hooks import update_bin

def seed_data():
    db = SessionLocal()
    try:
        # 1. Tenant & Admin
        tenant = db.query(Tenant).filter_by(name="SUMA-TECH").first()
        if not tenant:
            tenant = Tenant(name="SUMA-TECH")
            db.add(tenant); db.flush()
        
        admin = db.query(User).filter_by(username="admin@sumatech.in").first()
        if not admin:
            admin = User(
                username="admin@sumatech.in",
                password=hash_password("admin123"),
                role="Admin",
                tenant_id=tenant.id
            )
            db.add(admin); db.flush()

        # 2. Warehouses
        warehouses_data = [
            {"id": "WH-MAIN", "name": "Main Warehouse", "location": "Pune"},
            {"id": "WH-STORE", "name": "Store Room", "location": "Pune"},
            {"id": "WH-QC", "name": "QC Lab", "location": "Pune"}
        ]
        for wh in warehouses_data:
            if not db.query(Warehouse).filter_by(id=wh["id"], tenant_id=tenant.id).first():
                db.add(Warehouse(**wh, tenant_id=tenant.id))

        # 3. Suppliers
        suppliers = []
        for i in range(1, 4):
            s_name = f"Supplier {i}"
            s = db.query(Supplier).filter_by(name=s_name, tenant_id=tenant.id).first()
            if not s:
                s = Supplier(id=f"SUPP-{100+i}", name=s_name, contact="9876543210", address="India", category="General", tenant_id=tenant.id)
                db.add(s)
            suppliers.append(s_name)

        # 4. Products (Linked with Warehouse)
        products_data = [
            {"sku": "ITEM-CCTV-01", "name": "Hikvision 2MP Dome", "brand": "Hikvision", "category": "CCTV", "cost": 1200, "sell": 1800, "stock": 50, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-CCTV-02", "name": "Hikvision 2MP Bullet", "brand": "Hikvision", "category": "CCTV", "cost": 1400, "sell": 2100, "stock": 30, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-DVR-04", "name": "4 Channel DVR", "brand": "Dahua", "category": "DVR", "cost": 3500, "sell": 5200, "stock": 10, "warehouse": "WH-STORE"},
            {"sku": "ITEM-HD-1TB", "name": "WD Purple 1TB", "brand": "WD", "category": "Storage", "cost": 3200, "sell": 4200, "stock": 25, "warehouse": "WH-MAIN"},
        ]
        for p_data in products_data:
            p = db.query(Product).filter_by(sku=p_data["sku"], tenant_id=tenant.id).first()
            if not p:
                p = Product(**p_data, tenant_id=tenant.id)
                db.add(p); db.flush()
                # Link Stock with Warehouse (Initial Seeding)
                if p.stock > 0:
                    # Stock Ledger Entry
                    sle = StockLedger(
                        item_code=p.sku,
                        warehouse=p.warehouse,
                        qty=p.stock,
                        voucher_type="Opening Stock",
                        voucher_no="SEED-OPENING",
                        date=datetime.utcnow(),
                        tenant_id=tenant.id
                    )
                    db.add(sle)
                    # Sync Bin Balance (The missing link!)
                    update_bin(db, p.sku, p.warehouse, p.stock, tenant.id)

        # 5. Customers & Leads
        customers = []
        for i in range(1, 5):
            c_name = f"Customer {i} Pvt Ltd"
            c = db.query(Customer).filter_by(company=c_name, tenant_id=tenant.id).first()
            if not c:
                c = Customer(id=f"CUST-{100+i}", company=c_name, contact="John Doe", gst="27AAAAA0000A1Z5", tenant_id=tenant.id)
                db.add(c)
            customers.append(c_name)

        # 6. Accounts (Chart of Accounts)
        defaults = [
            {"code": "1100", "name": "Cash & Bank", "type": "Asset"},
            {"code": "1200", "name": "Accounts Receivable", "type": "Asset"},
            {"code": "1300", "name": "Inventory Asset", "type": "Asset"},
            {"code": "2100", "name": "Accounts Payable", "type": "Liability"},
            {"code": "4100", "name": "Sales Revenue", "type": "Income"},
            {"code": "5100", "name": "Cost of Goods Sold", "type": "Expense"},
        ]
        for acc in defaults:
            if not db.query(Account).filter_by(code=acc['code'], tenant_id=tenant.id).first():
                db.add(Account(**acc, tenant_id=tenant.id))

        db.commit()
        print("✅ Demo data seeded successfully with Warehouse-Stock links!")
    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
