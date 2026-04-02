import os
from sqlalchemy import text
from app.database import engine, Base
# Explicitly import all models to ensure they ARE in metadata
from app.models import Tenant, Lead, Attendance, Product, Warehouse

print("Cleaning Up DB...")
if os.path.exists("erp.db"):
    os.remove("erp.db")
    print("Deleted erp.db")
if os.path.exists("erp.db-shm"):
    os.remove("erp.db-shm")
if os.path.exists("erp.db-wal"):
    os.remove("erp.db-wal")

print("Recreating Metadata...")
# metadata.create_all(bind=engine)
Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    print("\nVerifying Lead table info after recreation:")
    res = conn.execute(text("PRAGMA table_info(leads)"))
    for r in res.fetchall():
        print(r)
    
    print("\nVerifying Attendance table info after recreation:")
    res = conn.execute(text("PRAGMA table_info(attendance)"))
    for r in res.fetchall():
        print(r)
