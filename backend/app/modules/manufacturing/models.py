from app.core.doc.base import BaseDocument
from app.modules.stock.engine import StockEngine

class BOM(BaseDocument):
    doctype: str = "BOM"

    def validate(self):
        if not self.get("item_code"):
            raise ValueError("Item code is required for BOM.")
        if not self.get("components"):
            raise ValueError("BOM must have components.")

class WorkOrder(BaseDocument):
    doctype: str = "Work Order"

    def validate(self):
        if not self.get("bom"):
             raise ValueError("BOM is required for Work Order.")

    def on_submit(self, db, tenant_id):
        """
        Submitting a Work Order = Finishing Production.
        Logic:
        1. Find the BOM.
        2. Deduct all components from stock.
        3. Add the finished product to stock.
        """
        super().on_submit()
        
        # 1. Fetch BOM logic (Mocked for demo but logic follows)
        stock = StockEngine(db, tenant_id)
        
        # 2. Consume Raw Materials
        components = self.get("components", []) # Usually pulled from BOM
        for c in components:
            stock.make_stock_entry(
                item_code=c.get("item_code"),
                warehouse=c.get("warehouse", "Raw Materials"),
                qty=-c.get("qty", 1),
                rate=c.get("rate", 0),
                voucher_type=self.doctype,
                voucher_no=self.name
            )
            
        # 3. Add Finished Product
        fg_item = self.get("item_code")
        fg_qty = self.get("qty", 1)
        stock.make_stock_entry(
            item_code=fg_item,
            warehouse=self.get("warehouse", "Finished Goods"),
            qty=fg_qty,
            rate=self.get("valuation_rate", 0), # Value should come from consumed materials
            voucher_type=self.doctype,
            voucher_no=self.name
        )
        
        print(f"Production for {self.name} completed successfully.")
