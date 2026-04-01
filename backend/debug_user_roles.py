
import sqlite3

def check_user_roles():
    db_path = r'c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute(f"PRAGMA table_info(user_roles);")
        cols = cursor.fetchall()
        print(f"Columns in user_roles: {len(cols)}")
        for c in cols:
            print(f"  {c[1]} ({c[2]})")
    except Exception as e:
        print(f"Error: {e}")
    conn.close()

if __name__ == "__main__":
    check_user_roles()
