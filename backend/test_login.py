import requests
data = {"username": "admin@erp.com", "password": "admin123"}
r = requests.post("http://localhost:8000/api/v1/auth/login", json=data)
print(r.status_code)
print(r.text)
