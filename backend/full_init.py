from app.database import engine, get_db
from app.models import Tenant, User, Role, Permission, Base
from datetime import datetime

def initialize():
    # Recreate all tables (already done but good practice)
    Base.metadata.create_all(bind=engine)
    
    db = next(get_db())
    
    # 1. Create Tenant
    tenant = db.query(Tenant).filter_by(id=1).first()
    if not tenant:
        tenant = Tenant(id=1, name="Suma Surveillance Systems", domain="localhost")
        db.add(tenant)
        db.flush()
        print("✅ Tenant created.")
    
    # 2. Create Admin Role
    admin_role = db.query(Role).filter_by(name="Administrator").first()
    if not admin_role:
        admin_role = Role(name="Administrator", tenant_id=1)
        db.add(admin_role)
        db.flush()
        print("✅ Admin Role created.")
    
    # 3. Create Admin User
    admin_user = db.query(User).filter_by(username="admin@sumatech.in").first()
    if not admin_user:
        # Note: passwords should be hashed in production, but match the demo/test requirement
        admin_user = User(
            username="admin@sumatech.in", 
            password="admin123", # or hashed if the app expects hash
            role="Admin",
            tenant_id=1
        )
        db.add(admin_user)
        db.flush()
        print("✅ Admin User created.")

    # 4. Give full permissions to Admin Role
    # (Assuming permissions are used by the system)
    
    db.commit()
    print("🚀 System Initialization Complete.")

if __name__ == "__main__":
    initialize()
