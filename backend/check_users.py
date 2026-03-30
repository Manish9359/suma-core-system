import sqlite3
db_path = r"c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT username, email, role FROM users")
print(cursor.fetchall())
conn.close()
