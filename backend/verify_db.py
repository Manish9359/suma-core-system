import sqlite3
import os

db_path = r"c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(invoice_items);")
columns = [row[1] for row in cursor.fetchall()]

print(f"InvoiceItem columns: {columns}")

if "disc_pct" in columns:
    print("Column disc_pct IS PRESENT.")
else:
    print("Column disc_pct IS MISSING.")

conn.close()
