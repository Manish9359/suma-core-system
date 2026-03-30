from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import (Product, StockLedger, Warehouse, Bin)
from app.modules.accounts.engine import AccountingEngine

class StockEngine:
    """
    Inventory Engine for suma-core-system.
    Handles movements, valuation (FIFO), and stock balance calculations.
    """
    
    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id
        self.accounts = AccountingEngine(db, tenant_id)

    def make_stock_entry(self, item_code: str, warehouse: str, qty: float, rate: float, voucher_type: str, voucher_no: str):
        """
        Record a stock movement and automatically trigger GL entries if required.
        """
        if qty == 0:
            return

        # 1. Update Product Master stock data
        product = self.db.query(Product).filter_by(sku=item_code, tenant_id=self.tenant_id).first()
        if not product:
            raise ValueError(f"Product '{item_code}' not found.")

        # update stock on the product record (physical balance)
        product.stock += qty
        
        # update low stock status
        # (Assume a generic threshold of 10)
        product.low = True if product.stock < 10 else False

        # 2. Record in Stock Ledger
        sle = StockLedger(
            item_code=item_code,
            warehouse=warehouse,
            qty=qty,
            voucher_type=voucher_type,
            voucher_no=voucher_no,
            valuation_rate=rate,
            tenant_id=self.tenant_id,
            date=datetime.now()
        )
        self.db.add(sle)
        
        # 3. Handle VALUATION (FIFO example)
        # For simplicity in this initial version, we use the passed-in "rate".
        # A full FIFO would scan the stock ledger for unconsumed inward entries.
        valuation_amount = abs(qty) * rate
        
        # 4. Integrate with Accounting (Inventory Asset vs COGS)
        gl_entries = []
        if qty > 0:
            # Receipt - Asset up (Inventory Asset Account 1300)
            gl_entries.append({"account": "1300", "debit": valuation_amount, "credit": 0, "description": f"Stock in: {item_code}"})
            # Credit Accounts Payable (2100) or Stock Received (temporary)
            gl_entries.append({"account": "2100", "debit": 0, "credit": valuation_amount, "description": f"Inventory Received: {item_code}"})
        else:
            # Issue - Asset down (Inventory Asset Account 1300)
            gl_entries.append({"account": "5100", "debit": valuation_amount, "credit": 0, "description": f"COGS: {item_code}"})
            gl_entries.append({"account": "1300", "debit": 0, "credit": valuation_amount, "description": f"Stock out: {item_code}"})
            
        try:
            self.accounts.post_gl_entries(gl_entries, voucher_type, voucher_no)
        except Exception as e:
            # Error in GL shouldn't break the Stock Ledger in some systems, 
            # but in a perfect ERP, and as per user instruction "Transaction atomicity", we allow it to raise.
            raise e

        # update DB
        self._update_bin(item_code, warehouse, qty, rate)

        self.db.flush() 
        return sle

    def _update_bin(self, item_code: str, warehouse: str, qty: float, rate: float):
        """Update the real-time stock cache (Bin)."""
        bin = self.db.query(Bin).filter_by(
            item_code=item_code, 
            warehouse=warehouse, 
            tenant_id=self.tenant_id
        ).first()
        
        if not bin:
            bin = Bin(item_code=item_code, warehouse=warehouse, tenant_id=self.tenant_id)
            self.db.add(bin)
            
        bin.actual_qty += qty
        # Update project_qty too (Simplified for now)
        bin.projected_qty = bin.actual_qty - bin.reserved_qty
        
        # Update current valuation rate on the bin
        # We can alternate between FIFO or Moving Average here
        bin.valuation_rate = self.calculate_valuation_rate(item_code, warehouse, method="Moving Average")

    def get_stock_balance(self, item_code: str, warehouse: Optional[str] = None) -> float:
        """Calculate the actual balance from the Stock Ledger entries."""
        query = self.db.query(func.sum(StockLedger.qty)).filter_by(
            item_code=item_code, 
            tenant_id=self.tenant_id
        )
        if warehouse:
            query = query.filter_by(warehouse=warehouse)
            
        return float(query.scalar() or 0)

    def calculate_valuation_rate(self, item_code: str, warehouse: Optional[str] = None, method: str = "FIFO") -> float:
        """
        Switches between business-grade stock valuation methods.
        - FIFO: Earliest lot cost.
        - Moving Average: Total inventory value / total quantity.
        """
        if method == "Moving Average":
            ledger = self.db.query(StockLedger).filter_by(
                item_code=item_code, 
                tenant_id=self.tenant_id
            )
            if warehouse:
                ledger = ledger.filter_by(warehouse=warehouse)
            
            # Simple weighted average: Sum(rate * qty) / Sum(qty)
            # Only for positive inward entries to establish value.
            inward = ledger.filter(StockLedger.qty > 0).all()
            if not inward:
                 return 0.0
            
            total_val = sum(float(i.qty) * float(i.valuation_rate) for i in inward)
            total_qty = sum(float(i.qty) for i in inward)
            return total_val / total_qty if total_qty else 0.0
            
        # --- FIFO Algorithm (Already implemented) ---
        # Get all entries sorted by date
        entries = self.db.query(StockLedger).filter_by(item_code=item_code, tenant_id=self.tenant_id)
        if warehouse:
            entries = entries.filter_by(warehouse=warehouse)
        
        ledger = entries.order_by(StockLedger.date.asc()).all()
        inward_lots = []
        total_qty = 0.0
        
        for sle in ledger:
            qty = float(sle.qty)
            rate = float(sle.valuation_rate or 0)
            if qty > 0:
                inward_lots.append({"qty": qty, "rate": rate})
                total_qty += qty
            else:
                qty_to_consume = abs(qty)
                total_qty -= qty_to_consume
                while qty_to_consume > 0 and inward_lots:
                    first = inward_lots[0]
                    if first["qty"] > qty_to_consume:
                        first["qty"] -= qty_to_consume
                        qty_to_consume = 0
                    else:
                        qty_to_consume -= first["qty"]
                        inward_lots.pop(0)

        if total_qty <= 0 or not inward_lots:
            p = self.db.query(Product).filter_by(sku=item_code, tenant_id=self.tenant_id).first()
            return p.cost if p else 0.0
        
        val_sum = sum(lot["qty"] * lot["rate"] for lot in inward_lots)
        return val_sum / total_qty
