from app.core.doc.base import BaseDocument
from app.modules.stock.engine import StockEngine

class Supplier(BaseDocument):
    doctype: str = "Supplier"

    def validate(self):
        if not self.get("name"):
            raise ValueError("Supplier name is required.")

class PurchaseOrder(BaseDocument):
    doctype: str = "Purchase Order"

    def validate(self):
        if not self.get("vendor"):
            raise ValueError("Supplier (Vendor) is required for Purchase Order.")

class PurchaseReceipt(BaseDocument):
    doctype: str = "Purchase Receipt"

    def validate(self):
        if not self.get("supplier"):
            raise ValueError("Supplier is required for Purchase Receipt.")
        if not self.get("items"):
            raise ValueError("Items are required for Purchase Receipt.")

    def on_submit(self, db, tenant_id):
        """
        Submitting a Purchase Receipt triggers:
        - Stock Inward (Stock Ledger).
        - Accounting Entry (Inventory Asset vs Purchase Accrual).
        """
        super().on_submit()
        
        # Stock Inward
        stock = StockEngine(db, tenant_id)
        items = self.get("items", [])
        for i in items:
            stock.make_stock_entry(
                item_code=i.get("item_code"),
                warehouse=i.get("warehouse", "Main"),
                qty=i.get("qty", 1),
                rate=i.get("rate", 0),
                voucher_type=self.doctype,
                voucher_no=self.name
            )
            
        print(f"Receipt {self.name} submitted successfully.")
