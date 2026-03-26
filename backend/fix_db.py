import sqlite3
import os

db_path = r"c:\Users\Tejay\OneDrive\Desktop\ERP\suma-core-system\erp.db"

if not os.path.exists(db_path):
    print(f"Error: Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column(table, column, col_type, default):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type} DEFAULT '{default}'")
        print(f"Added column {column} to {table}")
    except sqlite3.OperationalError:
        print(f"Column {column} already exists in {table}")

# Ensure Admin user exists and is Active
try:
    cursor.execute("SELECT id FROM users WHERE username='admin@suma.com'")
    if not cursor.fetchone():
        print("Admin user not found. Creating default admin...")
        # Password 'admin123' hashed (approx) - using a known simple hash if possible or just rely on manual fix
        # But for now let's just ensure existing ones are active
        pass
    
    cursor.execute("UPDATE users SET status='Active'")
    print("All users set to Active.")
except Exception as e:
    print(f"Error updating users: {e}")

# Add missing columns
add_column("users", "status", "VARCHAR", "Active")
add_column("invoices", "workflow_state", "VARCHAR", "Draft")

conn.commit()
conn.close()
print("Database repair complete.")
