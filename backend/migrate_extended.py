import sqlite3
import os

db_path = r"c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create new tables
tables = [
    """CREATE TABLE IF NOT EXISTS sales_orders (
        id TEXT PRIMARY KEY,
        customer TEXT,
        date TEXT,
        total REAL DEFAULT 0.0,
        status TEXT DEFAULT 'Draft',
        tenant_id INTEGER
    )""",
    """CREATE TABLE IF NOT EXISTS sales_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id TEXT,
        item_code TEXT,
        qty REAL,
        rate REAL
    )""",
    """CREATE TABLE IF NOT EXISTS purchase_receipts (
        id TEXT PRIMARY KEY,
        supplier TEXT,
        date TEXT,
        status TEXT DEFAULT 'Draft',
        tenant_id INTEGER
    )""",
    """CREATE TABLE IF NOT EXISTS purchase_receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id TEXT,
        item_code TEXT,
        qty REAL,
        warehouse TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS bills_of_materials (
        id TEXT PRIMARY KEY,
        item_code TEXT,
        qty REAL DEFAULT 1.0,
        total_cost REAL DEFAULT 0.0,
        tenant_id INTEGER
    )""",
    """CREATE TABLE IF NOT EXISTS bom_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id TEXT,
        item_code TEXT,
        qty REAL
    )""",
    """CREATE TABLE IF NOT EXISTS payment_entries (
        id TEXT PRIMARY KEY,
        date TEXT,
        party_type TEXT,
        party TEXT,
        payment_type TEXT,
        amount REAL DEFAULT 0.0,
        mode_of_payment TEXT,
        tenant_id INTEGER
    )"""
]

for sql in tables:
    try:
        cursor.execute(sql)
        print(f"Executed: {sql[:30]}...")
    except Exception as e:
        print(f"Error: {e}")

conn.commit()
conn.close()
print("Extended tables migration done.")
