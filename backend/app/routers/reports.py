
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import GLEntry
from sqlalchemy import func

router = APIRouter()

@router.get("/trial-balance")
def get_trial_balance(db: Session = Depends(get_db), tenant_id: int = Query(1)):
    """
    Real-Time Report showing the summary of all GL Entries.
    Demonstrates 'Point 1: Reports Updated' Principle.
    """
    results = db.query(
        GLEntry.account,
        func.sum(GLEntry.debit).label("total_debit"),
        func.sum(GLEntry.credit).label("total_credit")
    ).filter(GLEntry.tenant_id == tenant_id, GLEntry.is_cancelled == False).group_by(GLEntry.account).all()
    
    balance = []
    for r in results:
        net = (r.total_debit or 0) - (r.total_credit or 0)
        balance.append({
            "account": r.account,
            "debit": r.total_debit or 0,
            "credit": r.total_credit or 0,
            "balance": net
        })
        
    return {
        "status": "success",
        "data": balance,
        "total_debit": sum(b["debit"] for b in balance),
        "total_credit": sum(b["credit"] for b in balance)
    }

@router.get("/profit-and-loss")
def get_p_and_l(db: Session = Depends(get_db), tenant_id: int = Query(1)):
    """Point 14 logic: Real-time Profit & Loss statement (Income - Expense)."""
    # 1. Income
    income_results = db.query(GLEntry.account, func.sum(GLEntry.credit - GLEntry.debit).label("net")).filter(
        GLEntry.tenant_id == tenant_id, GLEntry.is_cancelled == False, GLEntry.account.contains("Income")
    ).group_by(GLEntry.account).all()
    
    # 2. Expense
    expense_results = db.query(GLEntry.account, func.sum(GLEntry.debit - GLEntry.credit).label("net")).filter(
        GLEntry.tenant_id == tenant_id, GLEntry.is_cancelled == False, GLEntry.account.contains("Expense")
    ).group_by(GLEntry.account).all()
    
    total_income = sum(r.net for r in income_results) or 0
    total_expense = sum(r.net for r in expense_results) or 0
    
    return {
        "status": "success",
        "income": { "items": income_results, "total": total_income },
        "expense": { "items": expense_results, "total": total_expense },
        "net_profit": total_income - total_expense
    }

@router.get("/balance-sheet")
def get_balance_sheet(db: Session = Depends(get_db), tenant_id: int = Query(1)):
    """Point 14 logic: Real-time Balance Sheet (Asset = Liability + Equity)."""
    # Simply categorized by Account Group (in a real system we'd use 'Account.root_type')
    all_balances = db.query(GLEntry.account, func.sum(GLEntry.debit - GLEntry.credit).label("balance")).filter(
        GLEntry.tenant_id == tenant_id, GLEntry.is_cancelled == False
    ).group_by(GLEntry.account).all()
    
    assets = [b for b in all_balances if "Asset" in b.account or "Receivable" in b.account]
    liabilities = [b for b in all_balances if "Payable" in b.account or "Liability" in b.account]
    equity = [b for b in all_balances if "Equity" in b.account or "Income" in b.account or "Expense" in b.account] # Simplified
    
    return {
        "status": "success",
        "assets": { "items": assets, "total": sum(a.balance for a in assets) },
        "liabilities": { "items": liabilities, "total": sum(l.balance for l in liabilities) },
        "equity": { "items": equity, "total": sum(e.balance for e in equity) }
    }
