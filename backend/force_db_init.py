
import sys
import os

# Add the current directory to sys.path so we can import from 'app'
sys.path.append(os.getcwd())

from app.database import engine, Base
from app.models import *

print("Attempting to create all tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")
except Exception as e:
    print(f"Error during table creation: {e}")
