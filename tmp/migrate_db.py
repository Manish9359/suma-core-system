import sqlite3
import os

db_path = 'backend/erp.db'
if not os.path.exists(db_path):
    # Try another path if not found
    db_path = 'erp.db'

print(f"Connecting to {os.path.abspath(db_path)}")
if not os.path.exists(db_path):
    print(f"❌ DB File not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Tables and columns to add
migrations = [
    ('customers', 'email', 'TEXT'),
    ('customers', 'phone', 'TEXT'),
    ('invoices', 'customer_name', 'TEXT'),
    ('invoices', 'customer_address', 'TEXT'),
    ('invoices', 'email', 'TEXT'),
    ('invoices', 'phone', 'TEXT')
]

for table, col, col_type in migrations:
    try:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        print(f"✅ Added {col} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"ℹ️ {col} already exists in {table}")
        else:
            print(f"❌ Error adding {col} to {table}: {e}")

# Also move data from custom_data if it exists
try:
    cur.execute("SELECT id, custom_data FROM customers")
    rows = cur.fetchall()
    for cid, custom_json in rows:
        if custom_json:
            import json
            try:
                data = json.loads(custom_json)
                email = data.get('email')
                phone = data.get('phone')
                if email or phone:
                    cur.execute("UPDATE customers SET email=?, phone=? WHERE id=?", (email, phone, cid))
                    print(f"🔥 Migrated custom_data for Customer {cid}")
            except: pass
except Exception as e:
    print(f"⚠️ Data migration warning: {e}")

conn.commit()
conn.close()
print("🎉 Migration Complete")
