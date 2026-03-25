import sqlite3
import os

db_path = r"c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Applying final model updates (Issues, Payments Ref, BOM Items)...")

try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        customer TEXT,
        subject TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'Medium',
        status TEXT DEFAULT 'Open',
        opening_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tenant_id INTEGER
    )
    """)
    print("✓ Issues table created.")
except Exception as e: print(f"Issues table error: {e}")

try:
    cursor.execute("ALTER TABLE payment_entries ADD COLUMN invoice_ref TEXT")
    cursor.execute("ALTER TABLE payment_entries ADD COLUMN notes TEXT")
    print("✓ PaymentEntry columns added.")
except Exception as e: print(f"PaymentEntry columns (might exist): {e}")

try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bom_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id TEXT,
        item_code TEXT,
        qty REAL
    )
    """)
    print("✓ BOM Items table created.")
except Exception as e: print(f"BOM Items table error: {e}")

try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id TEXT,
        item_code TEXT,
        qty REAL,
        rate REAL
    )
    """)
    print("✓ Sales Order Items table created.")
except Exception as e: print(f"Sales Order Items table error: {e}")

try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS purchase_receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id TEXT,
        item_code TEXT,
        qty REAL,
        warehouse TEXT
    )
    """)
    print("✓ Purchase Receipt Items table created.")
except Exception as e: print(f"Purchase Receipt Items table error: {e}")

try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id TEXT,
        item_code TEXT,
        qty REAL,
        rate REAL
    )
    """)
    print("✓ Purchase Order Items table created.")
except Exception as e: print(f"Purchase Order Items table error: {e}")

try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quality_inspections (
        id TEXT PRIMARY KEY,
        reference_type TEXT,
        reference_no TEXT,
        item_code TEXT,
        status TEXT,
        remarks TEXT,
        tenant_id INTEGER
    )
    """)
    print("✓ Quality Inspections table created.")
except Exception as e: print(f"Quality Inspections table error: {e}")

try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        name TEXT,
        purchase_date TEXT,
        gross_purchase_amount REAL,
        warehouse TEXT,
        status TEXT,
        tenant_id INTEGER
    )
    """)
    print("✓ Assets table created.")
except Exception as e: print(f"Assets table error: {e}")

conn.commit()
conn.close()
print("Migration completed.")
