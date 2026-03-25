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
    """CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        tenant_id INTEGER
    )""",
    """CREATE TABLE IF NOT EXISTS stock_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_code TEXT,
        warehouse TEXT,
        qty REAL,
        voucher_type TEXT,
        voucher_no TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        tenant_id INTEGER
    )""",
    """CREATE TABLE IF NOT EXISTS stock_entries (
        id TEXT PRIMARY KEY,
        purpose TEXT,
        date TEXT,
        total_qty REAL DEFAULT 0.0,
        total_amount REAL DEFAULT 0.0,
        status TEXT DEFAULT 'Draft',
        tenant_id INTEGER
    )""",
    """CREATE TABLE IF NOT EXISTS stock_entry_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id TEXT,
        item_code TEXT,
        qty REAL,
        s_warehouse TEXT,
        t_warehouse TEXT,
        rate REAL DEFAULT 0.0,
        amount REAL DEFAULT 0.0
    )""",
    """CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        address TEXT,
        category TEXT,
        tenant_id INTEGER
    )""",
    """CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'Open',
        customer TEXT,
        start_date TEXT,
        end_date TEXT,
        tenant_id INTEGER
    )""",
    """CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'Todo',
        assigned_to TEXT,
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
print("New tables migration done.")
