from backend.app.database import SessionLocal
from backend.app.models import Customer
import json

db = SessionLocal()
customers = db.query(Customer).limit(5).all()
for c in customers:
    print(f"ID: {c.id} | COMPANY: {c.company} | EMAIL: {getattr(c, 'email', 'N/A')} | PHONE: {getattr(c, 'phone', 'N/A')}")
    print(f"ADDR: {c.address} | CUSTOM: {json.dumps(c.custom_data, indent=2)}")
    print("-" * 40)
