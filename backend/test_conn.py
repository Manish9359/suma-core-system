
import requests
import json
import socket

BASE_URL = "http://127.0.0.1:8000"

def check_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', 8000))
    if result == 0:
        print("Port 8000 is OPEN")
    else:
        print("Port 8000 is CLOSED")
    sock.close()

def login():
    try:
        r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"username": "admin@erp.com", "password": "admin123"}, timeout=5)
        print(f"Login Status: {r.status_code}")
        return r.json()["access_token"]
    except Exception as e:
        print(f"Login Failed: {e}")
        return None

if __name__ == "__main__":
    check_port()
    login()
