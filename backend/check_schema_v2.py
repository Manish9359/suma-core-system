
import sqlite3
import os

def check_tables():
    db_path = r'c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} does not exist.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"Tables: {len(tables)}")
    
    for t in tables:
        print(f"\nTable: {t}")
        cursor.execute(f"PRAGMA table_info({t});")
        cols = cursor.fetchall()
        for c in cols:
            print(f"  {c[1]} ({c[2]})")
            
    conn.close()

if __name__ == "__main__":
    check_tables()
