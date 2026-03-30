import requests
# Get token first
data = {"email": "admin@erp.com", "password": "admin123"}
r = requests.post("http://localhost:8000/api/v1/auth/login", json=data)
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Test Lead List
r = requests.get("http://localhost:8000/api/v1/doc/Lead", headers=headers)
print(f"Lead status: {r.status_code}")
print(f"Lead data: {r.json()}")

# Test BOM List
r = requests.get("http://localhost:8000/api/v1/doc/BOM", headers=headers)
print(f"BOM status: {r.status_code}")
print(f"BOM data: {r.json()}")
