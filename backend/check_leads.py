from sqlalchemy import text
from app.database import engine
from app.models import Base

with engine.connect() as conn:
    res = conn.execute(text("PRAGMA table_info(leads)"))
    cols = res.fetchall()
    print("Column Status for Leads:")
    for c in cols:
        print(c)
    
    print("\nSample records for Leads:")
    res = conn.execute(text("SELECT * FROM leads LIMIT 5"))
    for row in res.fetchall():
        print(row)
