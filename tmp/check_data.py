from app.database import SessionLocal
from app.models import Customer, Product
import json

db = SessionLocal()
customers = db.query(Customer).limit(3).all()
for c in customers:
    print(f"ID: {c.id} | COMPANY: {c.company} | EMAIL: {getattr(c, 'email', 'N/A')} | PHONE: {getattr(c, 'phone', 'N/A')}")
    print(f"ADDR: {c.address} | CUSTOM: {json.dumps(c.custom_data, indent=2)}")
    print("-" * 40)
    
products = db.query(Product).limit(3).all()
for p in products:
    print(f"SKU: {p.sku} | NAME: {p.name} | SELL: {p.sell} | STOCK: {p.stock}")
