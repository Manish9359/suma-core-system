from typing import List, Dict, Any
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import (LedgerEntry, Account)

class ReportingEngine:
    """Generates financial statements based on the General Ledger."""
    
    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    def get_trial_balance(self) -> List[Dict[str, Any]]:
        """Trial Balance: Lists all accounts with their debit and credit totals."""
        results = self.db.query(
            LedgerEntry.account,
            func.sum(LedgerEntry.debit).label("total_debit"),
            func.sum(LedgerEntry.credit).label("total_credit")
        ).filter(LedgerEntry.tenant_id == self.tenant_id).group_by(LedgerEntry.account).all()
        
        # Merge with account names
        accounts = {a.code: a.name for a in self.db.query(Account).filter_by(tenant_id=self.tenant_id).all()}
        
        return [
            {
                "account": r.account,
                "name": accounts.get(r.account, "Unknown"),
                "debit": float(r.total_debit or 0),
                "credit": float(r.total_credit or 0),
                "balance": float((r.total_debit or 0) - (r.total_credit or 0))
            }
            for r in results
        ]

    def get_profit_and_loss(self) -> Dict[str, Any]:
        """P&L: Income minus Expenses."""
        # 1. Get all ledger entries for accounts with type 'Income' (4xxx) and 'Expense' (5xxx)
        # Assuming account codes 4xxx are Income and 5xxx are Expenses.
        
        income_entries = self.db.query(
            LedgerEntry.account,
            func.sum(LedgerEntry.credit - LedgerEntry.debit).label("total")
        ).join(Account, LedgerEntry.account == Account.code).filter(
            Account.type == "Income", LedgerEntry.tenant_id == self.tenant_id
        ).group_by(LedgerEntry.account).all()

        expense_entries = self.db.query(
            LedgerEntry.account,
            func.sum(LedgerEntry.debit - LedgerEntry.credit).label("total")
        ).join(Account, LedgerEntry.account == Account.code).filter(
            Account.type == "Expense", LedgerEntry.tenant_id == self.tenant_id
        ).group_by(LedgerEntry.account).all()

        total_income = sum(r.total or 0 for r in income_entries)
        total_expense = sum(r.total or 0 for r in expense_entries)

        return {
            "income_by_account": [{"account": r.account, "total": float(r.total or 0)} for r in income_entries],
            "expense_by_account": [{"account": r.account, "total": float(r.total or 0)} for r in expense_entries],
            "total_income": float(total_income),
            "total_expense": float(total_expense),
            "net_profit": float(total_income - total_expense)
        }

    def get_balance_sheet(self) -> Dict[str, Any]:
        """Balance Sheet: Assets, Liabilities, Equity."""
        # Assets (Type: Asset, e.g. 1xxx)
        asset_entries = self.db.query(
            Account.name,
            func.sum(LedgerEntry.debit - LedgerEntry.credit).label("total")
        ).join(LedgerEntry, LedgerEntry.account == Account.code).filter(
            Account.type == "Asset", Account.tenant_id == self.tenant_id
        ).group_by(Account.name).all()

        # Liabilities & Equity (Type: Liability, Equity, e.g. 2xxx, 3xxx)
        liability_entries = self.db.query(
            Account.name,
            func.sum(LedgerEntry.credit - LedgerEntry.debit).label("total")
        ).join(LedgerEntry, LedgerEntry.account == Account.code).filter(
            Account.type == "Liability", Account.tenant_id == self.tenant_id
        ).group_by(Account.name).all()

        equity_entries = self.db.query(
            Account.name,
            func.sum(LedgerEntry.credit - LedgerEntry.debit).label("total")
        ).join(LedgerEntry, LedgerEntry.account == Account.code).filter(
            Account.type == "Equity", Account.tenant_id == self.tenant_id
        ).group_by(Account.name).all()

        return {
            "assets": [{"account": r.name, "amount": float(r.total or 0)} for r in asset_entries],
            "liabilities": [{"account": r.name, "amount": float(r.total or 0)} for r in liability_entries],
            "equity": [{"account": r.name, "amount": float(r.total or 0)} for r in equity_entries],
            "total_assets": sum(r.total or 0 for r in asset_entries),
            "total_liabilities_equity": sum(r.total or 0 for r in liability_entries) + sum(r.total or 0 for r in equity_entries)
        }
    def get_summary(self) -> Dict[str, Any]:
        """High-level financial KPIs for the dashboard."""
        # Calculate Total Invoiced (Sum of Sales Invoices)
        # Using a raw query for simplicity in demo, or sum from GL
        # Sum Credit to Sales (4100) or Sum total receivables
        
        invoiced = self.db.query(func.sum(LedgerEntry.debit)).filter(
            LedgerEntry.account == "1200", # Accounts Receivable
            LedgerEntry.tenant_id == self.tenant_id
        ).scalar() or 0.0
        
        received = self.db.query(func.sum(LedgerEntry.credit)).filter(
            LedgerEntry.account == "1200",
            LedgerEntry.tenant_id == self.tenant_id
        ).scalar() or 0.0
        
        return {
            "total_invoiced": f"₹{invoiced:,.0f}",
            "received": f"₹{received:,.0f}",
            "outstanding": f"₹{(invoiced - received):,.0f}",
            "sales_trend": [], # Placeholder
            "inventory_status": {},
            "financial_health": 100 if invoiced == received else 80
        }
