from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth.security import get_current_user
from app.modules.accounts.reports import ReportingEngine
from app.models import User

router = APIRouter(tags=["Accounts Reports"])

@router.get("/trial-balance")
def get_trial_balance(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Summary of all accounts and their net debit/credit."""
    engine = ReportingEngine(db, user.tenant_id)
    return engine.get_trial_balance()

@router.get("/profit-and-loss")
def get_p_and_l(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Income Statement (Total Income vs Total Expense)."""
    engine = ReportingEngine(db, user.tenant_id)
    return engine.get_profit_and_loss()

@router.get("/balance-sheet")
def get_balance_sheet(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Balance Sheet (Asset = Liability + Equity)."""
    engine = ReportingEngine(db, user.tenant_id)
    return engine.get_balance_sheet()

@router.get("/summary")
def get_report_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """High-level financial KPIs for the dashboard."""
    engine = ReportingEngine(db, user.tenant_id)
    return engine.get_summary()
