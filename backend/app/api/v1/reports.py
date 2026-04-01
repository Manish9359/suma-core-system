from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.core.auth.security import get_current_user
from app.models import (
    User, Account, LedgerEntry, Invoice, Product, StockLedger,
    GLEntry, StockLedgerEntry, AuditLog
)

router = APIRouter(tags=["Reports"])

@router.get("/trial-balance")
def get_trial_balance(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    accounts = db.query(Account).filter_by(tenant_id=user.tenant_id).all()
    result = []
    for acc in accounts:
        entries = db.query(LedgerEntry).filter_by(account=acc.code, tenant_id=user.tenant_id).all()
        total_debit = sum(e.debit or 0 for e in entries)
        total_credit = sum(e.credit or 0 for e in entries)
        result.append({
            "code": acc.code, "name": acc.name, "type": acc.type,
            "debit": total_debit, "credit": total_credit,
            "balance": total_debit - total_credit
        })
    return result

@router.get("/profit-and-loss")
def get_profit_and_loss(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    accounts = db.query(Account).filter_by(tenant_id=user.tenant_id).all()
    
    income_accounts = [a for a in accounts if a.type == "Income"]
    expense_accounts = [a for a in accounts if a.type == "Expense"]
    
    total_income = 0.0
    income_details = []
    for acc in income_accounts:
        entries = db.query(LedgerEntry).filter_by(account=acc.code, tenant_id=user.tenant_id).all()
        balance = sum(e.credit - e.debit for e in entries)
        total_income += balance
        income_details.append({"code": acc.code, "name": acc.name, "amount": balance})

    total_expense = 0.0
    expense_details = []
    for acc in expense_accounts:
        entries = db.query(LedgerEntry).filter_by(account=acc.code, tenant_id=user.tenant_id).all()
        balance = sum(e.debit - e.credit for e in entries)
        total_expense += balance
        expense_details.append({"code": acc.code, "name": acc.name, "amount": balance})

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": total_income - total_expense,
        "income_by_account": income_details,
        "expense_by_account": expense_details
    }

@router.get("/balance-sheet")
def get_balance_sheet(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    accounts = db.query(Account).filter_by(tenant_id=user.tenant_id).all()
    
    def calc_balance(accs):
        result = []
        for acc in accs:
            entries = db.query(LedgerEntry).filter_by(account=acc.code, tenant_id=user.tenant_id).all()
            balance = sum(e.debit - e.credit for e in entries)
            result.append({"code": acc.code, "name": acc.name, "balance": balance})
        return result

    assets = calc_balance([a for a in accounts if a.type == "Asset"])
    liabilities = calc_balance([a for a in accounts if a.type == "Liability"])
    equity = calc_balance([a for a in accounts if a.type == "Equity"])

    return {
        "assets": assets, "total_assets": sum(a["balance"] for a in assets),
        "liabilities": liabilities, "total_liabilities": sum(l["balance"] for l in liabilities),
        "equity": equity, "total_equity": sum(e["balance"] for e in equity)
    }

@router.get("/summary")
def get_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    invoices = db.query(Invoice).filter_by(tenant_id=user.tenant_id).all()
    products = db.query(Product).filter_by(tenant_id=user.tenant_id).all()
    
    total_invoiced = sum(i.grand_total or 0 for i in invoices)
    pending = sum(i.grand_total or 0 for i in invoices if i.status == "Draft")
    submitted = sum(i.grand_total or 0 for i in invoices if i.workflow_state == "Submitted")
    
    return {
        "total_invoiced": total_invoiced,
        "pending": pending,
        "submitted": submitted,
        "total_products": len(products),
        "low_stock_count": sum(1 for p in products if p.low or p.stock < 10),
        "stock_value": sum(p.stock * p.cost for p in products),
        "sales_trend": [],
        "inventory_status": {"total": len(products), "low": sum(1 for p in products if p.low)},
        "financial_health": round(total_invoiced, 2)
    }

@router.get("/sales-chart")
def get_sales_chart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Monthly sales data for charts."""
    invoices = db.query(Invoice).filter_by(tenant_id=user.tenant_id).all()
    monthly = {}
    for inv in invoices:
        if inv.date:
            month = inv.date[:7]  # YYYY-MM
            monthly[month] = monthly.get(month, 0) + (inv.grand_total or 0)
    
    result = [{"month": k, "value": v} for k, v in sorted(monthly.items())]
    return result if result else [{"month": "No Data", "value": 0}]

@router.get("/revenue-chart")
def get_revenue_chart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    invoices = db.query(Invoice).filter_by(tenant_id=user.tenant_id).all()
    submitted = [i for i in invoices if i.workflow_state == "Submitted"]
    monthly = {}
    for inv in submitted:
        if inv.date:
            month = inv.date[:7]
            monthly[month] = monthly.get(month, 0) + (inv.grand_total or 0)
    result = [{"month": k, "value": v} for k, v in sorted(monthly.items())]
    return result if result else [{"month": "No Data", "value": 0}]

@router.get("/inventory-chart")
def get_inventory_chart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    products = db.query(Product).filter_by(tenant_id=user.tenant_id).all()
    categories = {}
    for p in products:
        cat = p.category or "Uncategorized"
        categories[cat] = categories.get(cat, 0) + (p.stock or 0)
    result = [{"name": k, "value": v} for k, v in categories.items()]
    return result if result else [{"name": "No Data", "value": 0}]

@router.get("/recent-activity")
def get_recent_activity(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    logs = db.query(AuditLog).filter_by(tenant_id=user.tenant_id).order_by(AuditLog.timestamp.desc()).limit(10).all()
    return [
        {
            "text": f"{l.action} {l.doctype}: {l.docname}",
            "time": l.timestamp.strftime("%b %d, %H:%M") if l.timestamp else "Recently"
        }
        for l in logs
    ]

@router.get("/stock-ledger")
def get_stock_ledger(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    entries = db.query(StockLedgerEntry).filter_by(tenant_id=user.tenant_id).order_by(StockLedgerEntry.id.desc()).limit(50).all()
    return [
        {
            "id": e.id, "item_code": e.item_code, "warehouse": e.warehouse,
            "qty_change": e.qty_change, "balance_qty": e.balance_qty,
            "voucher_type": e.voucher_type, "voucher_no": e.voucher_no,
            "posting_date": e.posting_date
        }
        for e in entries
    ]
