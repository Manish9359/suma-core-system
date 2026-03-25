import sqlite3
import os

db_path = r"c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column(table, column, type_):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_}")
        print(f"Added {column} to {table}")
    except sqlite3.OperationalError:
        print(f"Column {column} in {table} already exists or error occured.")

add_column("invoice_items", "disc_pct", "REAL DEFAULT 0.0")
add_column("quotations", "valid_till", "TEXT DEFAULT ''")
add_column("quotations", "grand_total", "REAL DEFAULT 0.0")
add_column("quotation_items", "disc_pct", "REAL DEFAULT 0.0")

conn.commit()
conn.close()
print("Migration done.")
