import sqlite3
db_path = r"c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT username, role, status FROM users")
print(f"Users in DB: {cursor.fetchall()}")
cursor.execute("SELECT name FROM roles")
print(f"Roles in DB: {cursor.fetchall()}")
conn.close()
