import sqlite3
import json
from datetime import datetime, timedelta

DB_PATH = "erp.db"

def seed():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Tenancy
    cur.execute("INSERT OR IGNORE INTO tenants (id, name) VALUES (1, 'Suma Surveillance Tech')")

    # 2. Customers
    customers = [
        ("CUST-001", "Global Solutions Ltd.", "John Doe", "New York, USA", "GSTIN12345", json.dumps({})),
        ("CUST-002", "Tech Innovators Inc.", "Jane Smith", "London, UK", "GSTIN67890", json.dumps({}))
    ]
    for c in customers:
        cur.execute("INSERT OR IGNORE INTO customers (id, company, contact, address, gst, custom_data, tenant_id) VALUES (?, ?, ?, ?, ?, ?, 1)", c)

    # 3. Products
    products = [
        ("CCTV-P1", "IP Camera 4K", "Suma", "CCTV", 2500.0, 4500.0, 50, "Main", 0, json.dumps({})),
        ("DVR-04", "4 Channel DVR", "Suma", "Recording", 4000.0, 7500.0, 20, "Main", 0, json.dumps({}))
    ]
    for p in products:
        cur.execute("INSERT OR IGNORE INTO products (sku, name, brand, category, cost, sell, stock, warehouse, low, custom_data, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", p)

    # 4. Invoices
    today = datetime.now().strftime("%Y-%m-%d")
    invoices = [
        ("INV-2026-001", "CUST-001", today, 4500.0, 810.0, 5310.0, "Draft", "Draft", json.dumps({}))
    ]
    for i in invoices:
        cur.execute("INSERT OR IGNORE INTO invoices (id, customer, date, amount, tax, grand_total, status, workflow_state, custom_data, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)", i)

    # 5. Leads
    leads = [
        ("Michael Scott", "Dunder Mifflin", "555-0199", "michael@dm.com", "Cold Call", "New", json.dumps({}))
    ]
    for l in leads:
        cur.execute("INSERT OR IGNORE INTO leads (name, company, phone, email, source, status, custom_data, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1)", l)

    # 6. AMC
    amcs = [
        ("AMC-2026-01", "CUST-001", "Surveillance System", today, (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"), 4, "Active")
    ]
    for a in amcs:
        cur.execute("INSERT OR IGNORE INTO amc_contracts (id, client, equipment, start_date, end_date, visits, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1)", a)

    conn.commit()
    conn.close()
    print("Seed data injected successfully!")

if __name__ == "__main__":
    seed()
