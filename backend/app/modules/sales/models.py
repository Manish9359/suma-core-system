from app.core.doc.base import BaseDocument

class Quotation(BaseDocument):
    doctype: str = "Quotation"

    def validate(self):
        if not self.get("customer"):
            raise ValueError("Customer is required for Quotation.")
        if not self.get("items"):
            raise ValueError("Items are required for Quotation.")

class SalesOrder(BaseDocument):
    doctype: str = "Sales Order"

    def validate(self):
        if not self.get("customer"):
            raise ValueError("Customer is required for Sales Order.")
        if not self.get("items"):
            raise ValueError("Items are required for Sales Order.")
        
    def on_submit(self):
        """
        Sales Orders often 'reserve' stock. 
        For this original logic, we will mark items as 'Reserved'.
        """
        super().on_submit()
        # Logic to update 'Projected Qty' could go here.
