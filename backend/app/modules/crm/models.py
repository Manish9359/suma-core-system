from app.core.doc.base import BaseDocument

class Customer(BaseDocument):
    doctype: str = "Customer"

    def validate(self):
        if not self.get("company"):
            raise ValueError("Company name is required for Customer.")

class Lead(BaseDocument):
    doctype: str = "Lead"

    def validate(self):
        if not self.get("name"):
            raise ValueError("Lead name is required.")

class Opportunity(BaseDocument):
    doctype: str = "Opportunity"

    def validate(self):
        if not self.get("customer"):
            raise ValueError("Customer is required for Opportunity.")
