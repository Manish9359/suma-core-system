
import sqlite3

def list_tables_clear():
    db_path = r'c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 20;")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"First 20 tables: {tables}")
    for t in tables:
        print(f"\nTable: {t}")
        cursor.execute(f"PRAGMA table_info({t});")
        cols = cursor.fetchall()
        for c in cols:
            print(f"  {c[1]} ({c[2]})")
    conn.close()

if __name__ == "__main__":
    list_tables_clear()
