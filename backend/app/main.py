from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.api.router import api_router
from app.core.doc.init_registry import initialize_registry

# 1. Create all tables
Base.metadata.create_all(bind=engine)

# 2. Initialize DocRegistry
initialize_registry()

app = FastAPI(title="SumaERP Backend", version="2.0.0")

# 3. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Routes
app.include_router(api_router)

# 5. Startup: seed default data
@app.on_event("startup")
def startup_event():
    from app.models import Tenant, User, Account, Role, Permission, Warehouse
    from app.core.auth.security import hash_password

    db = SessionLocal()
    try:
        # Seed Tenant
        if db.query(Tenant).count() == 0:
            tenant = Tenant(name="Suma Tech", domain="sumatech.in")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

            # Default Admin
            admin = User(
                username="admin@sumatech.in",
                password=hash_password("admin123"),
                role="Admin",
                tenant_id=tenant.id
            )
            db.add(admin)
            
            # Default Roles
            for role_name in ["Admin", "Manager", "Sales Executive", "Accountant", "Technician", "Warehouse Manager", "HR Manager"]:
                r = Role(name=role_name, tenant_id=tenant.id)
                db.add(r)
            db.commit()

            # Default Chart of Accounts
            accounts = [
                ("1000", "Assets", "Asset", True),
                ("1100", "Cash & Bank", "Asset", False),
                ("1200", "Accounts Receivable", "Asset", False),
                ("1300", "Inventory Asset", "Asset", False),
                ("2000", "Liabilities", "Liability", True),
                ("2100", "Accounts Payable", "Liability", False),
                ("2300", "GST Payable", "Liability", False),
                ("3000", "Equity", "Equity", True),
                ("3100", "Opening Balance", "Equity", False),
                ("4000", "Income", "Income", True),
                ("4100", "Sales Income", "Income", False),
                ("4200", "Service Income", "Income", False),
                ("5000", "Expenses", "Expense", True),
                ("5100", "Cost of Goods Sold", "Expense", False),
                ("5200", "Salary Expense", "Expense", False),
                ("5300", "General Expense", "Expense", False),
            ]
            for code, name, atype, is_group in accounts:
                db.add(Account(code=code, name=name, type=atype, is_group=is_group, balance=0.0, tenant_id=tenant.id))

            # Default Warehouse
            db.add(Warehouse(id="WH-001", name="Main Warehouse", location="Pune", tenant_id=tenant.id))
            db.commit()
            
            print("✅ SumaERP: Initial data seeded (admin@sumatech.in / admin123)")
        else:
            user_count = db.query(User).count()
            print(f"✅ SumaERP: Database ready ({user_count} users)")
    except Exception as e:
        print(f"❌ Seeding error: {e}")
        db.rollback()
    finally:
        db.close()

@app.get("/")
def root():
    return {"status": "running", "system": "SumaERP", "version": "2.0"}
