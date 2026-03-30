import requests
import json
import time
from typing import Dict, Any, Optional, Callable
from app.core.background import BackgroundEngine

class IntegrationEngine:
    """
    Handles external service integrations (Stripe, Email, Webhooks).
    Includes retry logic and error logging.
    """
    
    @staticmethod
    def send_webhook(url: str, payload: Dict[str, Any], retries: int = 3):
        """
        Send a payload to an external URL with a retry mechanism.
        Uses background processing to avoid blocking main thread.
        """
        def task():
            attempt = 0
            while attempt < retries:
                try:
                    response = requests.post(url, json=payload, timeout=10)
                    if response.status_code < 300:
                        print(f"Webhook Success: {url}")
                        return
                    print(f"Webhook Fail ({response.status_code}): {url}")
                except Exception as e:
                    print(f"Webhook Error: {url} -> {e}")
                
                attempt += 1
                time.sleep(2 ** attempt) # Exponential backoff
            
        BackgroundEngine.enqueue(task)

class EmailService:
    """Handles professional SMTP email dispatch."""
    
    @staticmethod
    def send(to: str, subject: str, body: str):
        """Dispatches an email via the background engine."""
        def task():
            # In a real system, use smtplib here
            print(f"EMAIL SENT TO: {to} | SUBJECT: {subject}")
            
        BackgroundEngine.enqueue(task)

class StripeGateway:
    """Mock implementation of a payment gateway integration."""
    
    @staticmethod
    def create_checkout(amount: float, currency: str = "INR"):
        # Real logic would use the stripe-python library
        return {"id": "cs_test_" + str(int(time.time())), "url": "https://stripe.com/pay"}
