import sys
import os
sys.path.append(os.getcwd())

from app.core.doc.service import DocService
from sqlalchemy.orm import Session
from app.database import SessionLocal

db = SessionLocal()
svc = DocService(db, tenant_id=1)
model = svc._get_model("Sales Invoice")
print(f"Model for Sales Invoice: {model}")
if model:
    print(f"Model columns: {model.__table__.columns.keys()}")
else:
    from app import models
    print(f"Models dir: {dir(models)}")

db.close()
