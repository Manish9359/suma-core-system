import sqlite3
import os

db_path = r"c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE ledger_entries ADD COLUMN voucher_type VARCHAR")
    print("Added voucher_type")
except Exception as e:
    print(f"Error adding voucher_type: {e}")

try:
    cursor.execute("ALTER TABLE ledger_entries ADD COLUMN voucher_no VARCHAR")
    print("Added voucher_no")
except Exception as e:
    print(f"Error adding voucher_no: {e}")

conn.commit()
conn.close()
