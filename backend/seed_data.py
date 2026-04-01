
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def login():
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"username": "admin@erp.com", "password": "admin123"})
    return r.json()["access_token"]

def create_doc(doctype, data, token):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{BASE_URL}/api/v1/doc/{doctype}", json=data, headers=headers)
    print(f"Status {r.status_code} for {doctype}")
    if r.status_code >= 400:
        print(f"Error: {r.text}")
    return r.json()

def seed():
    token = login()
    
    # Products
    create_doc("Product", {"name": "4MP IP Camera", "item_group": "Finished Good", "uom": "Nos", "standard_rate": 4500}, token)
    create_doc("Product", {"name": "4-Channel DVR", "item_group": "Finished Good", "uom": "Nos", "standard_rate": 6000}, token)
    
    # Customers
    create_doc("Customer", {"company": "Acme Corp", "contact": "John Doe", "address": "New York"}, token)
    create_doc("Customer", {"company": "Globex Inc", "contact": "Jane Smith", "address": "San Francisco"}, token)

    # Leads
    create_doc("Lead", {"name": "Potential Project A", "source": "Website", "status": "New"}, token)
    
    # Accounts
    create_doc("Account", {"code": "1001", "name": "Cash", "account_type": "Asset"}, token)
    create_doc("Account", {"code": "1002", "name": "HDFC Bank", "account_type": "Asset"}, token)
    create_doc("Account", {"code": "2001", "name": "Accounts Receivable", "account_type": "Asset"}, token)
    create_doc("Account", {"code": "3001", "name": "Sales Income", "account_type": "Income"}, token)

if __name__ == "__main__":
    seed()
