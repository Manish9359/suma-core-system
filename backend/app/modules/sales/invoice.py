from typing import Dict, Any, List
from app.core.doc.base import BaseDocument, DocumentStatus
from app.modules.stock.engine import StockEngine
from app.modules.accounts.engine import AccountingEngine
from sqlalchemy.orm import Session

class SalesInvoice(BaseDocument):
    """
    Business logic for Sales Invoice DocType.
    Ties together Stock and Accounting engines.
    """
    
    doctype: str = "Sales Invoice"

    def validate(self):
        """Validate tax calculations and items list."""
        items = self._data.get("items", [])
        if not items:
            raise ValueError("Invoice must have at least one item.")
        
        # Simple subtotal validation
        total = 0.0
        for i in items:
            total += i.get("qty", 1) * i.get("rate", 0)
        
        self.set("amount", total)
        # Tax logic (Simplified for demo)
        tax = total * 0.18 # Fixed 18% tax for demo
        self.set("tax", tax)
        self.set("grand_total", total + tax)

    def on_submit(self, db: Session, tenant_id: int):
        """Logic to execute on submission (Finalizing accounts and stock)."""
        super().on_submit() # Changes status to Submitted
        
        # 1. Deduct Stock
        stock = StockEngine(db, tenant_id)
        items = self._data.get("items", [])
        for i in items:
            stock.make_stock_entry(
                item_code=i.get("item_code"),
                warehouse=i.get("warehouse", "Main"),
                qty=-i.get("qty", 1),
                rate=i.get("rate", 0),
                voucher_type=self.doctype,
                voucher_no=self.name
            )
            
        # 2. Post Accounting Entry
        self._post_accounts(db, tenant_id)

    def _post_accounts(self, db: Session, tenant_id: int):
        """
        Creates balanced double-entry GL for the invoice.
        Debit: Accounts Receivable (1200)
        Credit: Sales Income (4100)
        Credit: GST Payable (2300)
        """
        accounts = AccountingEngine(db, tenant_id)
        
        grand_total = self.get("grand_total")
        amount = self.get("amount")
        tax = self.get("tax")
        
        gl_batch = [
            # Debit: Customer Account (Receivable)
            {"account": "1200", "debit": grand_total, "credit": 0, "description": f"Invoice {self.name}"},
            # Credit: Income Account
            {"account": "4100", "debit": 0, "credit": amount, "description": "Sales Income"},
            # Credit: Tax Account
            {"account": "2300", "debit": 0, "credit": tax, "description": "Output GST"}
        ]
        
        accounts.post_gl_entries(gl_batch, self.doctype, self.name)
