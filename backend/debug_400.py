import requests
import json

base_url = "http://localhost:8080" # Wait, frontend is 8080, backend is 8000
# The log shows uvicorn running usually on 8000
backend_url = "http://localhost:8000"

# Use static token from a known user or just see the response detail
resp = requests.get(f"{backend_url}/api/v1/doc/Sales%20Invoice")
print(f"Status: {resp.status_code}")
print(f"Body: {resp.text}")
