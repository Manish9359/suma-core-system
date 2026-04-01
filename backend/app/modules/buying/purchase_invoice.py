"""
Purchase Invoice model and meta JSON for the buying module.
"""
from app.core.doc.base import BaseDocument

class PurchaseInvoice(BaseDocument):
    doctype: str = "Purchase Invoice"

    def validate(self):
        if not self.get("supplier"):
            raise ValueError("Supplier is required for Purchase Invoice.")
        items = self.get("items", [])
        if not items:
            raise ValueError("Items are required.")
        total = 0.0
        for i in items:
            total += i.get("qty", 1) * i.get("rate", 0)
        self.set("amount", total)
        tax = total * (self.get("gst_rate", 18) / 100)
        self.set("tax", tax)
        self.set("grand_total", total + tax)

    def on_submit(self, db=None, tenant_id=None):
        super().on_submit()
        # Post GL entries for purchase
        if db and tenant_id:
            from app.modules.accounts.engine import AccountingEngine
            accounts = AccountingEngine(db, tenant_id)
            grand_total = self.get("grand_total", 0)
            amount = self.get("amount", 0)
            tax = self.get("tax", 0)
            gl_batch = [
                {"account": "1300", "debit": amount, "credit": 0, "description": f"Inventory from {self.name}"},
                {"account": "2300", "debit": tax, "credit": 0, "description": "Input GST"},
                {"account": "2100", "debit": 0, "credit": grand_total, "description": f"Payable for {self.name}"},
            ]
            accounts.post_gl_entries(gl_batch, self.doctype, self.name)
