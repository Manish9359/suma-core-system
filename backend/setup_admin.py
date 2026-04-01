
import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models import User, Tenant, Role, Permission
from app.core.auth.security import hash_password

def setup():
    db = SessionLocal()
    
    # 1. Tenant
    tenant = Tenant(id=1, name="Suma Surveillance", domain="suma.com")
    db.add(tenant)
    db.flush()
    
    # 2. Roles
    admin_role = Role(id=1, name="Admin", tenant_id=1)
    db.add(admin_role)
    db.flush()
    
    # 3. Permissions
    doctypes = ["Lead", "Customer", "Opportunity", "Product", "Sales Invoice", "Quotation", "Sales Order", "Account", "Warehouse"]
    for dt in doctypes:
        p = Permission(
            role_id=1,
            doctype=dt,
            can_read=True, 
            can_write=True, 
            can_create=True, 
            can_delete=True,
            can_submit=True
        )
        db.add(p)
    
    # 4. Admin User
    admin = User(
        username="admin@erp.com",
        password=hash_password("admin123"),
        role="Admin", 
        tenant_id=1
    )
    db.add(admin)
    
    db.commit()
    print("Setup completed successfully!")
    db.close()

if __name__ == "__main__":
    setup()
