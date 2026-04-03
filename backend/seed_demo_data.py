"""
Comprehensive demo data seeder for SumaERP.
Seeds ALL modules with realistic Indian business data.
"""
import random
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import (
    Base, Tenant, User, Customer, Lead, Product,
    Warehouse, StockLedger, Bin, Supplier, Employee,
    Account, LedgerEntry, Invoice, InvoiceItem,
    Quotation, QuotationItem, SalesOrder, SalesOrderItem,
    PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseReceiptItem,
    PurchaseInvoiceModel, Opportunity, Project, Task, Issue,
    AMC, Installation, PaymentEntry, Attendance, SalarySlip,
    BOM, BOMItem, CompanySettings, Role, Permission,
    GLEntry, StockLedgerEntry, Timesheet, TimesheetItem
)
from app.core.auth.security import hash_password
from app.core.doc.ledger_hooks import update_bin

TODAY = datetime.utcnow().strftime("%Y-%m-%d")
YEAR = datetime.utcnow().year

def d(days_ago: int) -> str:
    return (datetime.utcnow() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

def seed_data():
    db = SessionLocal()
    try:
        # ══════════ 1. TENANT & USERS ══════════
        tenant = db.query(Tenant).filter_by(name="SUMA-TECH").first()
        if not tenant:
            tenant = Tenant(name="SUMA-TECH", domain="sumatech.in")
            db.add(tenant); db.flush()

        users_data = [
            {"username": "admin@sumatech.in", "password": "admin123", "role": "Admin"},
            {"username": "manager@sumatech.in", "password": "manager123", "role": "Manager"},
            {"username": "sales@sumatech.in", "password": "sales123", "role": "Employee"},
            {"username": "accounts@sumatech.in", "password": "acc123", "role": "Employee"},
        ]
        for u in users_data:
            if not db.query(User).filter_by(username=u["username"]).first():
                db.add(User(username=u["username"], password=hash_password(u["password"]),
                            role=u["role"], status="Active", tenant_id=tenant.id))
        db.flush()

        # ══════════ 2. COMPANY SETTINGS ══════════
        if not db.query(CompanySettings).filter_by(tenant_id=tenant.id).first():
            db.add(CompanySettings(
                company_name="Suma Surveillance Tech Pvt. Ltd.",
                gstin="27AADCS1234N1Z5",
                address="Office No. 12, 3rd Floor, Gera Imperium Rise,\nHinjawadi Phase II, Pune - 411057, Maharashtra",
                phone="+91 020-68197600",
                email="billing@sumatech.in",
                bank_name="HDFC Bank Ltd.",
                bank_account="50200036547891",
                bank_ifsc="HDFC0001234",
                bank_branch="Hinjawadi, Pune",
                terms="Payment terms – 100% Advanced.\nDelivery time – 7 to 10 Days.\nGoods once sold will not be taken back.\nSubject to Pune jurisdiction only.\nAll disputes subject to Pune courts.",
                tenant_id=tenant.id
            ))

        # ══════════ 3. ROLES & PERMISSIONS ══════════
        roles_data = ["Admin", "Manager", "Accountant", "Sales Executive", "Warehouse Staff"]
        for rn in roles_data:
            if not db.query(Role).filter_by(name=rn, tenant_id=tenant.id).first():
                db.add(Role(name=rn, tenant_id=tenant.id))
        db.flush()

        # ══════════ 4. WAREHOUSES ══════════
        warehouses = [
            {"id": "WH-MAIN", "name": "Main Warehouse", "location": "Pune - Hinjawadi"},
            {"id": "WH-STORE", "name": "Store Room", "location": "Pune - Kothrud"},
            {"id": "WH-QC", "name": "QC Lab", "location": "Pune - Hinjawadi"},
            {"id": "WH-SITE", "name": "Site Stock", "location": "Mumbai"},
        ]
        for wh in warehouses:
            if not db.query(Warehouse).filter_by(id=wh["id"], tenant_id=tenant.id).first():
                db.add(Warehouse(**wh, tenant_id=tenant.id))

        # ══════════ 5. SUPPLIERS ══════════
        suppliers_data = [
            {"id": "SUPP-001", "name": "Hikvision India Pvt Ltd", "contact": "9876543210", "address": "Plot B-14, MIDC Ranjangaon, Pune", "category": "CCTV"},
            {"id": "SUPP-002", "name": "Dahua Technology India", "contact": "9876543211", "address": "Unit 7, Bhosari MIDC, Pune", "category": "DVR/NVR"},
            {"id": "SUPP-003", "name": "D-Link India Ltd", "contact": "9876543212", "address": "Andheri East, Mumbai", "category": "Networking"},
            {"id": "SUPP-004", "name": "WD Technologies India", "contact": "9876543213", "address": "Electronic City, Bangalore", "category": "Storage"},
            {"id": "SUPP-005", "name": "Schneider Electric India", "contact": "9876543214", "address": "Whitefield, Bangalore", "category": "Power/UPS"},
        ]
        for s in suppliers_data:
            if not db.query(Supplier).filter_by(id=s["id"], tenant_id=tenant.id).first():
                db.add(Supplier(**s, tenant_id=tenant.id))

        # ══════════ 6. PRODUCTS ══════════
        products_data = [
            {"sku": "ITEM-CAM-001", "name": "Hikvision 2MP Dome Camera", "brand": "Hikvision", "category": "CCTV", "cost": 1200, "sell": 1850, "stock": 120, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-CAM-002", "name": "Hikvision 2MP Bullet Camera", "brand": "Hikvision", "category": "CCTV", "cost": 1400, "sell": 2100, "stock": 85, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-CAM-003", "name": "Hikvision 4MP IP Dome", "brand": "Hikvision", "category": "IP Camera", "cost": 3200, "sell": 4500, "stock": 45, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-CAM-004", "name": "Dahua 2MP PTZ Camera", "brand": "Dahua", "category": "CCTV", "cost": 8500, "sell": 12000, "stock": 8, "warehouse": "WH-STORE"},
            {"sku": "ITEM-DVR-001", "name": "4 Channel DVR (1080P)", "brand": "Hikvision", "category": "DVR", "cost": 3500, "sell": 5200, "stock": 30, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-DVR-002", "name": "8 Channel DVR (1080P)", "brand": "Hikvision", "category": "DVR", "cost": 5800, "sell": 8500, "stock": 20, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-NVR-001", "name": "8 Channel NVR (4MP)", "brand": "Dahua", "category": "NVR", "cost": 7200, "sell": 10500, "stock": 15, "warehouse": "WH-STORE"},
            {"sku": "ITEM-HDD-001", "name": "WD Purple 1TB HDD", "brand": "WD", "category": "Storage", "cost": 3200, "sell": 4200, "stock": 60, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-HDD-002", "name": "WD Purple 2TB HDD", "brand": "WD", "category": "Storage", "cost": 5500, "sell": 7000, "stock": 35, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-HDD-003", "name": "Seagate SkyHawk 4TB", "brand": "Seagate", "category": "Storage", "cost": 9800, "sell": 12500, "stock": 10, "warehouse": "WH-STORE"},
            {"sku": "ITEM-CBL-001", "name": "Cat6 Cable 305m Box", "brand": "D-Link", "category": "Cable", "cost": 4500, "sell": 6200, "stock": 25, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-CBL-002", "name": "3+1 Coaxial Cable 90m", "brand": "Polycab", "category": "Cable", "cost": 1800, "sell": 2500, "stock": 40, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-SW-001", "name": "8 Port PoE Switch", "brand": "D-Link", "category": "Networking", "cost": 3800, "sell": 5500, "stock": 18, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-SW-002", "name": "16 Port PoE Switch", "brand": "D-Link", "category": "Networking", "cost": 8500, "sell": 12000, "stock": 5, "warehouse": "WH-STORE"},
            {"sku": "ITEM-UPS-001", "name": "APC 600VA UPS", "brand": "APC", "category": "Power", "cost": 2800, "sell": 3800, "stock": 22, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-MON-001", "name": "Hikvision 32\" LED Monitor", "brand": "Hikvision", "category": "Display", "cost": 12000, "sell": 16500, "stock": 3, "warehouse": "WH-STORE"},
            {"sku": "ITEM-ACC-001", "name": "CCTV Junction Box (Pack of 10)", "brand": "Generic", "category": "Accessories", "cost": 250, "sell": 450, "stock": 200, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-ACC-002", "name": "BNC Connector Pack (100)", "brand": "Generic", "category": "Accessories", "cost": 400, "sell": 700, "stock": 150, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-SVC-001", "name": "Installation Service (Per Camera)", "brand": "Suma", "category": "Service", "cost": 0, "sell": 500, "stock": 999, "warehouse": "WH-MAIN"},
            {"sku": "ITEM-SVC-002", "name": "Annual Maintenance Contract", "brand": "Suma", "category": "Service", "cost": 0, "sell": 2500, "stock": 999, "warehouse": "WH-MAIN"},
        ]
        for p in products_data:
            if not db.query(Product).filter_by(sku=p["sku"], tenant_id=tenant.id).first():
                prod = Product(**p, tenant_id=tenant.id)
                db.add(prod); db.flush()
                if prod.stock > 0:
                    sle = StockLedger(item_code=prod.sku, warehouse=prod.warehouse, qty=prod.stock,
                                      voucher_type="Opening Stock", voucher_no="SEED-OPENING",
                                      date=datetime.utcnow(), tenant_id=tenant.id)
                    db.add(sle)
                    update_bin(db, prod.sku, prod.warehouse, prod.stock, tenant.id)

        # ══════════ 7. CUSTOMERS ══════════
        customers_data = [
            {"id": "CUST-001", "company": "Reliance Jio Infocomm Ltd", "contact": "Rajesh Sharma", "email": "procurement@jio.com", "phone": "9820123456", "address": "Navi Mumbai, Maharashtra", "gst": "27AAACR5055K1ZK"},
            {"id": "CUST-002", "company": "Tata Consultancy Services", "contact": "Priya Mehta", "email": "facilities@tcs.com", "phone": "9820123457", "address": "Hinjawadi IT Park, Pune", "gst": "27AAACT2727Q1ZW"},
            {"id": "CUST-003", "company": "Infosys BPM Ltd", "contact": "Amit Patel", "email": "security@infosys.com", "phone": "9820123458", "address": "Rajiv Gandhi IT Park, Chandigarh", "gst": "04AABCI1234H1Z2"},
            {"id": "CUST-004", "company": "Phoenix Mills Ltd", "contact": "Sneha Desai", "email": "admin@phoenixmills.com", "phone": "9820123459", "address": "Lower Parel, Mumbai", "gst": "27AAACP1234M1ZL"},
            {"id": "CUST-005", "company": "Godrej Properties Ltd", "contact": "Vikram Singh", "email": "projects@godrej.com", "phone": "9820123460", "address": "Vikhroli East, Mumbai", "gst": "27AAACG1395D1ZX"},
            {"id": "CUST-006", "company": "Serum Institute of India", "contact": "Dr. Anil Kulkarni", "email": "infra@seruminstitute.com", "phone": "9820123461", "address": "Hadapsar, Pune", "gst": "27AAACS1234R1Z5"},
            {"id": "CUST-007", "company": "Bajaj Auto Ltd", "contact": "Manoj Joshi", "email": "security@bajajauto.co.in", "phone": "9820123462", "address": "Akurdi, Pune", "gst": "27AABCB1234A1ZQ"},
            {"id": "CUST-008", "company": "Pune Municipal Corporation", "contact": "Shri. Patil", "email": "it@punecorporation.org", "phone": "020-25501000", "address": "Shivajinagar, Pune", "gst": "27AAAPL1234K1Z8"},
        ]
        for c in customers_data:
            if not db.query(Customer).filter_by(id=c["id"], tenant_id=tenant.id).first():
                db.add(Customer(**c, tenant_id=tenant.id))

        # ══════════ 8. LEADS ══════════
        leads_data = [
            {"id": "LEAD-001", "name": "Mahesh Agarwal", "company": "Agarwal Builders", "phone": "9881234567", "email": "mahesh@agarwal.com", "source": "Website", "status": "New"},
            {"id": "LEAD-002", "name": "Sunita Rathi", "company": "Rathi Supermarket", "phone": "9881234568", "email": "sunita@rathi.com", "source": "Referral", "status": "Contacted"},
            {"id": "LEAD-003", "name": "Deepak Verma", "company": "Verma Hospitals", "phone": "9881234569", "email": "deepak@verma.com", "source": "Cold Call", "status": "Interested"},
            {"id": "LEAD-004", "name": "Kavita Nair", "company": "Nair IT Solutions", "phone": "9881234570", "email": "kavita@nairit.com", "source": "Exhibition", "status": "Quotation Sent"},
            {"id": "LEAD-005", "name": "Rohit Gupta", "company": "Gupta Warehousing", "phone": "9881234571", "email": "rohit@guptawh.com", "source": "Website", "status": "New"},
        ]
        for l in leads_data:
            if not db.query(Lead).filter_by(id=l["id"], tenant_id=tenant.id).first():
                db.add(Lead(**l, tenant_id=tenant.id))

        # ══════════ 9. OPPORTUNITIES ══════════
        opps_data = [
            {"id": f"OPP-{YEAR}-001", "customer": "CUST-001", "contact": "Rajesh Sharma", "status": "Open", "value": 450000, "source": "Existing Client", "expected_closing": d(0)},
            {"id": f"OPP-{YEAR}-002", "customer": "CUST-003", "contact": "Amit Patel", "status": "Quotation Sent", "value": 180000, "source": "Tender", "expected_closing": d(-15)},
            {"id": f"OPP-{YEAR}-003", "customer": "CUST-005", "contact": "Vikram Singh", "status": "Won", "value": 750000, "source": "Referral", "expected_closing": d(10)},
        ]
        for o in opps_data:
            if not db.query(Opportunity).filter_by(id=o["id"], tenant_id=tenant.id).first():
                db.add(Opportunity(**o, tenant_id=tenant.id))

        # ══════════ 10. EMPLOYEES ══════════
        emps_data = [
            {"id": "EMP-001", "name": "Rahul Deshmukh", "role": "Site Engineer", "dept": "Operations", "salary": 35000, "joining": "2023-06-15", "status": "Active"},
            {"id": "EMP-002", "name": "Pooja Kulkarni", "role": "Sales Executive", "dept": "Sales", "salary": 28000, "joining": "2024-01-10", "status": "Active"},
            {"id": "EMP-003", "name": "Sanjay Patil", "role": "Sr. Technician", "dept": "Operations", "salary": 32000, "joining": "2022-03-01", "status": "Active"},
            {"id": "EMP-004", "name": "Neha Joshi", "role": "Accountant", "dept": "Finance", "salary": 30000, "joining": "2023-09-20", "status": "Active"},
            {"id": "EMP-005", "name": "Amit Sawant", "role": "Warehouse Manager", "dept": "Inventory", "salary": 27000, "joining": "2024-04-01", "status": "Active"},
            {"id": "EMP-006", "name": "Prashant More", "role": "Technician", "dept": "Operations", "salary": 22000, "joining": "2024-07-15", "status": "Active"},
            {"id": "EMP-007", "name": "Kavita Bhosale", "role": "HR Executive", "dept": "HR", "salary": 26000, "joining": "2023-11-01", "status": "Active"},
            {"id": "EMP-008", "name": "Ravi Gaikwad", "role": "Delivery Boy", "dept": "Logistics", "salary": 18000, "joining": "2025-01-10", "status": "Active"},
        ]
        for e in emps_data:
            if not db.query(Employee).filter_by(id=e["id"], tenant_id=tenant.id).first():
                db.add(Employee(**e, tenant_id=tenant.id))

        # ══════════ 11. ACCOUNTS (Chart of Accounts) ══════════
        accounts_data = [
            {"code": "1000", "name": "Assets", "type": "Asset", "is_group": True},
            {"code": "1100", "name": "Cash & Bank", "type": "Asset", "parent_id": "1000"},
            {"code": "1200", "name": "Accounts Receivable", "type": "Asset", "parent_id": "1000"},
            {"code": "1300", "name": "Inventory Asset", "type": "Asset", "parent_id": "1000"},
            {"code": "2000", "name": "Liabilities", "type": "Liability", "is_group": True},
            {"code": "2100", "name": "Accounts Payable", "type": "Liability", "parent_id": "2000"},
            {"code": "2300", "name": "GST Payable", "type": "Liability", "parent_id": "2000"},
            {"code": "3000", "name": "Equity", "type": "Equity", "is_group": True},
            {"code": "3100", "name": "Owner's Capital", "type": "Equity", "parent_id": "3000"},
            {"code": "4000", "name": "Income", "type": "Income", "is_group": True},
            {"code": "4100", "name": "Sales Revenue", "type": "Income", "parent_id": "4000"},
            {"code": "4200", "name": "Service Revenue", "type": "Income", "parent_id": "4000"},
            {"code": "5000", "name": "Expenses", "type": "Expense", "is_group": True},
            {"code": "5100", "name": "Cost of Goods Sold", "type": "Expense", "parent_id": "5000"},
            {"code": "5200", "name": "Salaries & Wages", "type": "Expense", "parent_id": "5000"},
            {"code": "5300", "name": "Rent", "type": "Expense", "parent_id": "5000"},
            {"code": "5400", "name": "Utilities", "type": "Expense", "parent_id": "5000"},
        ]
        for acc in accounts_data:
            if not db.query(Account).filter_by(code=acc["code"], tenant_id=tenant.id).first():
                db.add(Account(**acc, tenant_id=tenant.id))

        db.flush()

        # ══════════ 12. QUOTATIONS ══════════
        quotations_data = [
            {"id": f"QTN-{YEAR}-00001", "customer": "CUST-001", "date": d(30), "valid_till": d(-30), "amount": 92500, "grand_total": 109150, "status": "Submitted"},
            {"id": f"QTN-{YEAR}-00002", "customer": "CUST-003", "date": d(20), "valid_till": d(-10), "amount": 45000, "grand_total": 53100, "status": "Draft"},
            {"id": f"QTN-{YEAR}-00003", "customer": "CUST-005", "date": d(5), "valid_till": d(-25), "amount": 210000, "grand_total": 247800, "status": "Submitted"},
        ]
        for q in quotations_data:
            if not db.query(Quotation).filter_by(id=q["id"], tenant_id=tenant.id).first():
                db.add(Quotation(**q, tenant_id=tenant.id))
                db.flush()
                # items
                db.add(QuotationItem(quotation_id=q["id"], item_code="ITEM-CAM-001", qty=16, rate=1850, amount=29600))
                db.add(QuotationItem(quotation_id=q["id"], item_code="ITEM-DVR-002", qty=2, rate=8500, amount=17000))

        # ══════════ 13. SALES ORDERS ══════════
        so_data = [
            {"id": f"SO-{YEAR}-00001", "customer": "CUST-002", "date": d(25), "total": 164500, "status": "Submitted"},
            {"id": f"SO-{YEAR}-00002", "customer": "CUST-004", "date": d(15), "total": 87500, "status": "Draft"},
            {"id": f"SO-{YEAR}-00003", "customer": "CUST-006", "date": d(7), "total": 325000, "status": "Completed"},
        ]
        for so in so_data:
            if not db.query(SalesOrder).filter_by(id=so["id"], tenant_id=tenant.id).first():
                db.add(SalesOrder(**so, tenant_id=tenant.id))
                db.flush()
                db.add(SalesOrderItem(parent_id=so["id"], item_code="ITEM-CAM-003", qty=10, rate=4500))
                db.add(SalesOrderItem(parent_id=so["id"], item_code="ITEM-NVR-001", qty=2, rate=10500))

        # ══════════ 14. SALES INVOICES ══════════
        inv_data = [
            {"id": f"SINV-{YEAR}-00001", "customer": "CUST-001", "customer_name": "Reliance Jio Infocomm Ltd", "customer_address": "Navi Mumbai, Maharashtra",
             "email": "procurement@jio.com", "phone": "9820123456", "date": d(20), "amount": 92500, "tax": 16650, "grand_total": 109150, "status": "Submitted", "workflow_state": "Submitted"},
            {"id": f"SINV-{YEAR}-00002", "customer": "CUST-002", "customer_name": "Tata Consultancy Services", "customer_address": "Hinjawadi IT Park, Pune",
             "email": "facilities@tcs.com", "phone": "9820123457", "date": d(12), "amount": 164500, "tax": 29610, "grand_total": 194110, "status": "Draft", "workflow_state": "Draft"},
            {"id": f"SINV-{YEAR}-00003", "customer": "CUST-006", "customer_name": "Serum Institute of India", "customer_address": "Hadapsar, Pune",
             "email": "infra@seruminstitute.com", "phone": "9820123461", "date": d(5), "amount": 325000, "tax": 58500, "grand_total": 383500, "status": "Submitted", "workflow_state": "Submitted"},
        ]
        for inv in inv_data:
            if not db.query(Invoice).filter_by(id=inv["id"], tenant_id=tenant.id).first():
                db.add(Invoice(**inv, tenant_id=tenant.id))
                db.flush()
                db.add(InvoiceItem(invoice_id=inv["id"], item_code="ITEM-CAM-001", qty=16, rate=1850, amount=29600))
                db.add(InvoiceItem(invoice_id=inv["id"], item_code="ITEM-DVR-002", qty=2, rate=8500, amount=17000))
                db.add(InvoiceItem(invoice_id=inv["id"], item_code="ITEM-HDD-001", qty=2, rate=4200, amount=8400))

                # GL entries for submitted invoices
                if inv["status"] == "Submitted":
                    db.add(GLEntry(account="1200", posting_date=inv["date"], voucher_type="Sales Invoice",
                                   voucher_no=inv["id"], debit=inv["grand_total"], credit=0,
                                   remarks=f"Invoice {inv['id']}", tenant_id=tenant.id))
                    db.add(GLEntry(account="4100", posting_date=inv["date"], voucher_type="Sales Invoice",
                                   voucher_no=inv["id"], debit=0, credit=inv["amount"],
                                   remarks="Sales Revenue", tenant_id=tenant.id))
                    db.add(GLEntry(account="2300", posting_date=inv["date"], voucher_type="Sales Invoice",
                                   voucher_no=inv["id"], debit=0, credit=inv["tax"],
                                   remarks="Output GST", tenant_id=tenant.id))

        # ══════════ 15. PURCHASE ORDERS ══════════
        po_data = [
            {"id": f"PO-{YEAR}-00001", "vendor": "SUPP-001", "date": d(35), "items": 3, "total": 78000, "status": "Submitted"},
            {"id": f"PO-{YEAR}-00002", "vendor": "SUPP-003", "date": d(20), "items": 2, "total": 45000, "status": "Draft"},
            {"id": f"PO-{YEAR}-00003", "vendor": "SUPP-004", "date": d(10), "items": 4, "total": 125000, "status": "Submitted"},
        ]
        for po in po_data:
            if not db.query(PurchaseOrder).filter_by(id=po["id"], tenant_id=tenant.id).first():
                db.add(PurchaseOrder(**po, tenant_id=tenant.id))
                db.flush()
                db.add(PurchaseOrderItem(parent_id=po["id"], item_code="ITEM-CAM-001", qty=50, rate=1200))
                db.add(PurchaseOrderItem(parent_id=po["id"], item_code="ITEM-HDD-001", qty=20, rate=3200))

        # ══════════ 16. PURCHASE RECEIPTS ══════════
        pr_data = [
            {"id": f"PR-{YEAR}-00001", "supplier": "SUPP-001", "date": d(30), "status": "Submitted", "workflow_state": "Submitted"},
            {"id": f"PR-{YEAR}-00002", "supplier": "SUPP-004", "date": d(8), "status": "Draft", "workflow_state": "Draft"},
        ]
        for pr in pr_data:
            if not db.query(PurchaseReceipt).filter_by(id=pr["id"], tenant_id=tenant.id).first():
                db.add(PurchaseReceipt(**pr, tenant_id=tenant.id))
                db.flush()
                db.add(PurchaseReceiptItem(parent_id=pr["id"], item_code="ITEM-CAM-001", qty=50, warehouse="WH-MAIN"))
                db.add(PurchaseReceiptItem(parent_id=pr["id"], item_code="ITEM-HDD-001", qty=20, warehouse="WH-MAIN"))

        # ══════════ 17. PURCHASE INVOICES ══════════
        pinv_data = [
            {"id": f"PINV-{YEAR}-00001", "supplier": "SUPP-001", "date": d(28), "amount": 78000, "tax": 14040, "grand_total": 92040,
             "purchase_order": f"PO-{YEAR}-00001", "status": "Submitted", "workflow_state": "Submitted"},
        ]
        for pi in pinv_data:
            if not db.query(PurchaseInvoiceModel).filter_by(id=pi["id"], tenant_id=tenant.id).first():
                db.add(PurchaseInvoiceModel(**pi, tenant_id=tenant.id))

        # ══════════ 18. PAYMENT ENTRIES ══════════
        pay_data = [
            {"id": f"PAY-{YEAR}-00001", "date": d(18), "party_type": "Customer", "party": "CUST-001", "payment_type": "Receive",
             "amount": 109150, "mode_of_payment": "Bank Transfer", "invoice_ref": f"SINV-{YEAR}-00001", "notes": "Full payment received"},
            {"id": f"PAY-{YEAR}-00002", "date": d(25), "party_type": "Supplier", "party": "SUPP-001", "payment_type": "Pay",
             "amount": 92040, "mode_of_payment": "NEFT", "notes": "PO payment"},
        ]
        for p in pay_data:
            if not db.query(PaymentEntry).filter_by(id=p["id"], tenant_id=tenant.id).first():
                db.add(PaymentEntry(**p, tenant_id=tenant.id))

        # ══════════ 19. PROJECTS ══════════
        proj_data = [
            {"id": "PROJ-001", "name": "Jio Office CCTV Setup", "status": "Open", "customer": "CUST-001", "start_date": d(40), "end_date": d(-20)},
            {"id": "PROJ-002", "name": "TCS Campus Security", "status": "Open", "customer": "CUST-002", "start_date": d(25), "end_date": d(-45)},
            {"id": "PROJ-003", "name": "Phoenix Mall Surveillance", "status": "Completed", "customer": "CUST-004", "start_date": d(90), "end_date": d(10)},
        ]
        for p in proj_data:
            if not db.query(Project).filter_by(id=p["id"], tenant_id=tenant.id).first():
                db.add(Project(**p, tenant_id=tenant.id))
                db.flush()
                db.add(Task(project_id=p["id"], title="Site Survey", status="Done", assigned_to="EMP-001", tenant_id=tenant.id))
                db.add(Task(project_id=p["id"], title="Cable Laying", status="In Progress", assigned_to="EMP-003", tenant_id=tenant.id))
                db.add(Task(project_id=p["id"], title="Camera Installation", status="Todo", assigned_to="EMP-006", tenant_id=tenant.id))

        # ══════════ 20. ISSUES (Service) ══════════
        issues_data = [
            {"id": "ISS-001", "customer": "CUST-004", "subject": "Camera offline at Gate 3", "description": "DVR not recording from camera at main gate", "priority": "High", "status": "Open"},
            {"id": "ISS-002", "customer": "CUST-001", "subject": "Night vision blur on Dome 5", "description": "IR LEDs seem weak", "priority": "Medium", "status": "Open"},
            {"id": "ISS-003", "customer": "CUST-007", "subject": "NVR storage full", "description": "Need to upgrade HDD or adjust recording schedule", "priority": "Low", "status": "Closed"},
        ]
        for iss in issues_data:
            if not db.query(Issue).filter_by(id=iss["id"], tenant_id=tenant.id).first():
                db.add(Issue(**iss, tenant_id=tenant.id))

        # ══════════ 21. AMC CONTRACTS ══════════
        amc_data = [
            {"id": "AMC-001", "client": "CUST-004", "equipment": "16 Camera System + 2 NVR", "start_date": d(180), "end_date": d(-185), "visits": 4, "status": "Active"},
            {"id": "AMC-002", "client": "CUST-007", "equipment": "8 Camera DVR Setup", "start_date": d(90), "end_date": d(-275), "visits": 2, "status": "Active"},
            {"id": "AMC-003", "client": "CUST-001", "equipment": "32 Camera IP System", "start_date": d(365), "end_date": d(5), "visits": 4, "status": "Expired"},
        ]
        for a in amc_data:
            if not db.query(AMC).filter_by(id=a["id"], tenant_id=tenant.id).first():
                db.add(AMC(**a, tenant_id=tenant.id))

        # ══════════ 22. INSTALLATIONS ══════════
        inst_data = [
            {"id": "INS-001", "sales_order": f"SO-{YEAR}-00001", "customer": "CUST-002", "installation_date": d(10), "engineer": "EMP-001", "status": "Completed"},
            {"id": "INS-002", "sales_order": f"SO-{YEAR}-00003", "customer": "CUST-006", "installation_date": d(-5), "engineer": "EMP-003", "status": "Pending"},
        ]
        for ins in inst_data:
            if not db.query(Installation).filter_by(id=ins["id"], tenant_id=tenant.id).first():
                db.add(Installation(**ins, tenant_id=tenant.id))

        # ══════════ 23. ATTENDANCE ══════════
        for emp_id in ["EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-005"]:
            for day_offset in range(30):
                att_date = d(day_offset)
                att_id = f"ATT-{emp_id}-{att_date}"
                if not db.query(Attendance).filter_by(id=att_id, tenant_id=tenant.id).first():
                    weekday = (datetime.utcnow() - timedelta(days=day_offset)).weekday()
                    if weekday < 6:  # Mon-Sat
                        status = random.choice(["Present"]*9 + ["Half Day"])
                    else:
                        status = "Absent"
                    db.add(Attendance(id=att_id, employee_id=emp_id, date=att_date, status=status, tenant_id=tenant.id))

        # ══════════ 24. SALARY SLIPS ══════════
        for emp in emps_data[:5]:
            slip_id = f"SAL-{YEAR}-{emp['id']}"
            if not db.query(SalarySlip).filter_by(id=slip_id, tenant_id=tenant.id).first():
                gross = emp["salary"]
                ded = round(gross * 0.12, 2)  # PF
                db.add(SalarySlip(id=slip_id, employee_id=emp["id"], start_date=f"{YEAR}-03-01",
                                  end_date=f"{YEAR}-03-31", gross_pay=gross, deductions=ded,
                                  net_pay=gross - ded, status="Submitted", tenant_id=tenant.id))

        # ══════════ 25. BOM ══════════
        bom_data = [
            {"id": "BOM-4CAM-KIT", "item_code": "ITEM-DVR-001", "qty": 1, "total_cost": 12100},
        ]
        for b in bom_data:
            if not db.query(BOM).filter_by(id=b["id"], tenant_id=tenant.id).first():
                db.add(BOM(**b, tenant_id=tenant.id))
                db.flush()
                db.add(BOMItem(parent_id=b["id"], item_code="ITEM-CAM-001", qty=4))
                db.add(BOMItem(parent_id=b["id"], item_code="ITEM-CBL-002", qty=1))
                db.add(BOMItem(parent_id=b["id"], item_code="ITEM-ACC-001", qty=1))
                db.add(BOMItem(parent_id=b["id"], item_code="ITEM-ACC-002", qty=1))

        # ══════════ 26. LEDGER ENTRIES (Accounting) ══════════
        ledger_data = [
            {"date": d(20), "account": "1200", "debit": 109150, "credit": 0, "description": "Invoice SINV-{}-00001".format(YEAR),
             "voucher_type": "Sales Invoice", "voucher_no": f"SINV-{YEAR}-00001"},
            {"date": d(20), "account": "4100", "debit": 0, "credit": 92500, "description": "Sales Revenue",
             "voucher_type": "Sales Invoice", "voucher_no": f"SINV-{YEAR}-00001"},
            {"date": d(20), "account": "2300", "debit": 0, "credit": 16650, "description": "Output GST",
             "voucher_type": "Sales Invoice", "voucher_no": f"SINV-{YEAR}-00001"},
            {"date": d(18), "account": "1100", "debit": 109150, "credit": 0, "description": "Payment received from Reliance",
             "voucher_type": "Payment Entry", "voucher_no": f"PAY-{YEAR}-00001"},
            {"date": d(18), "account": "1200", "debit": 0, "credit": 109150, "description": "AR cleared",
             "voucher_type": "Payment Entry", "voucher_no": f"PAY-{YEAR}-00001"},
        ]
        for le in ledger_data:
            exists = db.query(LedgerEntry).filter_by(voucher_no=le["voucher_no"], account=le["account"], tenant_id=tenant.id).first()
            if not exists:
                db.add(LedgerEntry(**le, tenant_id=tenant.id))

        db.commit()
        print("✅ Comprehensive demo data seeded successfully!")
        print(f"   📦 Products: {len(products_data)}")
        print(f"   👥 Customers: {len(customers_data)}")
        print(f"   🏢 Suppliers: {len(suppliers_data)}")
        print(f"   👷 Employees: {len(emps_data)}")
        print(f"   📄 Invoices: {len(inv_data)}")
        print(f"   📋 Quotations: {len(quotations_data)}")
        print(f"   🛒 Purchase Orders: {len(po_data)}")
        print(f"   🎯 Projects: {len(proj_data)}")
        print(f"   🔧 AMC Contracts: {len(amc_data)}")
        print(f"   💰 Payment Entries: {len(pay_data)}")

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"❌ Seed failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
