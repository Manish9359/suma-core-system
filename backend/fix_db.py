from app.database import SessionLocal
from app.models import Tenant, User
from app.security import hash_password

db = SessionLocal()
t = db.query(Tenant).first()
if not t:
    t = Tenant(name="ERPBase")
    db.add(t)
    db.commit()
    db.refresh(t)

admin = db.query(User).filter_by(username="admin@erp.com").first()
if not admin:
    print("User not found, adding admin@erp.com...")
    admin = User(username="admin@erp.com", password=hash_password("admin123"), role="Admin", tenant_id=t.id)
    db.add(admin)
    db.commit()
    print("Admin added successfully.")
else:
    print("Admin exists. Re-hashing password to be safe...")
    admin.password = hash_password("admin123")
    db.commit()

admin_suma = db.query(User).filter_by(username="admin@sumatech.in").first()
if not admin_suma:
    print("Adding admin@sumatech.in as well for convenience...")
    u2 = User(username="admin@sumatech.in", password=hash_password("admin123"), role="Admin", tenant_id=t.id)
    db.add(u2)
    db.commit()
else:
    admin_suma.password = hash_password("admin123")
    db.commit()

print("Fix completed.")
