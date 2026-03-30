from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api.router import api_router
from app.core.background import BackgroundEngine
from app.core.doc.init_registry import initialize_registry

# 1. Initialize DB tables
Base.metadata.create_all(bind=engine)

# 2. Initialize the DocRegistry (Business logic mappings)
initialize_registry()

app = FastAPI(title="suma-core-system", version="1.0.0")

# 3. CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Global Router Integration (includes /api/v1/auth, /api/v1/doc, /api/v1/reports)
app.include_router(api_router)

# 5. Background Task Lifecycle
@app.on_event("startup")
def startup_event():
    # 1. Start Background Engine
    BackgroundEngine.start_worker()
    print("Suma Core: Background Engine successfully initialized.")

    # 2. Seed default tenant and user if they don't exist (First Boot)
    from app.database import SessionLocal
    from app.models import Tenant, User
    from app.core.auth.security import hash_password, ALGORITHM
    
    db = SessionLocal()
    try:
        if db.query(Tenant).count() == 0:
            print("Suma Core: Seeding initial data...")
            tenant = Tenant(name="Suma Tech", domain="sumatech.in")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            
            # Default Admin User
            admin_user = User(
                username="admin@sumatech.in",
                password=hash_password("admin123"),
                role="Admin",
                tenant_id=tenant.id
            )
            db.add(admin_user)
            db.commit()
            print(f"Suma Core: Default Admin user created: admin@sumatech.in / admin123")
        else:
            print(f"Suma Core: Database check complete ({db.query(User).count()} users found)")
    except Exception as e:
        print(f"Suma Core: Seeding failed: {str(e)}")
    finally:
        db.close()

    print("Suma Core: Startup complete.")

@app.on_event("shutdown")
def shutdown_event():
    BackgroundEngine.stop_worker()
    print("Suma Core: Shutdown complete.")

@app.get("/")
def read_root():
    return {"status": "running", "schema": "modular", "core": "suma-v1"}
