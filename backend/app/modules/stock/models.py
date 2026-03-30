from app.core.doc.base import BaseDocument

class Product(BaseDocument):
    doctype: str = "Product"

    def validate(self):
        if not self.get("sku"):
            raise ValueError("Product SKU is mandatory.")

class Warehouse(BaseDocument):
    doctype: str = "Warehouse"

    def validate(self):
        if not self.get("name"):
            raise ValueError("Warehouse name is mandatory.")
