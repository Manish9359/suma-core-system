import requests
import json

base_url = "http://localhost:8000"

# 1. Login
login_data = {"username": "admin@erp.com", "password": "admin123"}
lr = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
if lr.status_code != 200:
    print(f"Login failed: {lr.status_code} {lr.text}")
    exit(1)

token = lr.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. List Docs recorded in log as 400
doctypes = ["Sales Invoice", "Customer", "Product"]
for dt in doctypes:
    print(f"\n--- Testing DocType: {dt} ---")
    resp = requests.get(f"{base_url}/api/v1/doc/{dt}", headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
