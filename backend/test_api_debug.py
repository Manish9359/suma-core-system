import requests

BASE_URL = "http://localhost:8000/api/v1"

def test_api():
    # 1. Login to get token
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "admin@erp.com", "password": "admin123"})
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.text}")
        return
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Get Lead
    resp = requests.get(f"{BASE_URL}/doc/Lead", headers=headers)
    print(f"GET /doc/Lead: {resp.status_code}")
    if resp.status_code != 200:
        print(resp.text)

    # 3. Test Meta Lead
    resp = requests.get(f"{BASE_URL}/doc/meta/Lead", headers=headers)
    print(f"GET /doc/meta/Lead: {resp.status_code}")
    if resp.status_code != 200:
        print(resp.text)

if __name__ == "__main__":
    test_api()
