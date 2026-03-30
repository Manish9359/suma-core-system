from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import (Account, LedgerEntry)

class AccountingEngine:
    """
    Core Accounting Logic for suma-core-system.
    Ensures accuracy and balance in the double-entry system.
    """
    
    # Rounding tolerance for balanced entries (e.g. 0.01 currency units)
    TOLERANCE = 0.001

    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    def post_gl_entries(self, entries: List[Dict[str, Any]], voucher_type: str, voucher_no: str, date: Optional[str] = None):
        """
        Post balanced GL entries for a given voucher.
        Entries format: [{"account": "1201", "debit": 100, "credit": 0, "description": "..."}, ...]
        """
        if not entries:
            return

        date = date or datetime.now().strftime("%Y-%m-%d")
        
        # 1. Normalize entries (handle negative values by flipping debit/credit)
        normalized = self._normalize_entries(entries)
        
        # 2. Validate Balance (Sum of Debits must equal Sum of Credits)
        self._validate_balance(normalized)
        
        # 3. Save entries
        saved_entries = []
        for entry in normalized:
            le = LedgerEntry(
                date=date,
                account=entry["account"],
                debit=float(entry.get("debit", 0)),
                credit=float(entry.get("credit", 0)),
                description=entry.get("description", f"Entry for {voucher_type} {voucher_no}"),
                voucher_type=voucher_type,
                voucher_no=voucher_no,
                tenant_id=self.tenant_id
            )
            self.db.add(le)
            saved_entries.append(le)
        
        self.db.commit()
        return saved_entries

    def reverse_gl_entries(self, voucher_type: str, voucher_no: str):
        """Reverse all GL entries associated with a voucher (for cancellation)."""
        existing = self.db.query(LedgerEntry).filter_by(
            voucher_type=voucher_type, 
            voucher_no=voucher_no, 
            tenant_id=self.tenant_id
        ).all()
        
        if not existing:
            return

        # Prepare reversal map: swap debit and credit
        reversal = []
        for e in existing:
            reversal.append({
                "account": e.account,
                "debit": e.credit,
                "credit": e.debit,
                "description": f"REVERSAL: {e.description}"
            })
        
        return self.post_gl_entries(reversal, voucher_type, voucher_no)

    def _normalize_entries(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ported from professional practices: Flip negative debit/credits."""
        for entry in entries:
            debit = float(entry.get("debit", 0))
            credit = float(entry.get("credit", 0))
            
            if debit < 0:
                credit += abs(debit)
                debit = 0
            if credit < 0:
                debit += abs(credit)
                credit = 0
                
            entry["debit"] = round(debit, 6)
            entry["credit"] = round(credit, 6)
        return entries

    def _validate_balance(self, entries: List[Dict[str, Any]]):
        """Ensures that the total debits equal total credits."""
        total_debit = sum(e.get("debit", 0) for e in entries)
        total_credit = sum(e.get("credit", 0) for e in entries)
        
        diff = abs(total_debit - total_credit)
        if diff > self.TOLERANCE:
            raise ValueError(
                f"Accounting Imbalance: Total Debits ({total_debit}) != Total Credits ({total_credit}). "
                f"Diff: {diff}"
            )
        
    def _update_account_balances(self, entries: List[Dict]):
        """
        Updates actual account balances and rolls them up to groups.
        """
        for entry in entries:
            code = entry["account"]
            # Balance change: Credit (Increase Liability/Income, Decrease Asset/Expense for some logic) 
            # In double-entry, we sum (Debit - Credit) for Assets and (Credit - Debit) for Others.
            
            acc = self.db.query(Account).filter_by(code=code, tenant_id=self.tenant_id).first()
            if not acc:
                continue
                
            amount = entry["debit"] - entry["credit"]
            self._recursive_update_balance(acc, amount)

    def _recursive_update_balance(self, acc: Account, amount: float):
        """Update the current account and all its parents recursively."""
        acc.balance += amount
        if acc.parent_id:
            parent = self.db.query(Account).filter_by(code=acc.parent_id, tenant_id=self.tenant_id).first()
            if parent:
                self._recursive_update_balance(parent, amount)
        
    def get_account_balance(self, account_code: str) -> float:
        """Returns the current balance of an account as a float."""
        # Simple Sum from GL
        # In a high-performance system, we'd use a cached balance table.
        result = self.db.query(
            LedgerEntry.debit, LedgerEntry.credit
        ).filter_by(account=account_code, tenant_id=self.tenant_id).all()
        
        balance = sum(r[0] for r in result) - sum(r[1] for r in result)
        return balance
