
import sqlite3

def check_users():
    db_path = r'c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role FROM users;")
    users = cursor.fetchall()
    print(f"Users found: {len(users)}")
    for u in users:
        print(f"  {u[0]}: {u[1]} ({u[2]})")
    conn.close()

if __name__ == "__main__":
    check_users()
