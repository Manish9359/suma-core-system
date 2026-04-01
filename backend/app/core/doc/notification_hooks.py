
from sqlalchemy.orm import Session
from app.models import Notification
from .base import BaseDocument

def notify_on_submission(doc: BaseDocument, db: Session, tenant_id: int):
    """Automation logic (Phase 8): Send a system notification when a key document is submitted."""
    key_doctypes = ["Sales Invoice", "Purchase Order", "Work Order", "Salary Slip"]
    
    if doc.doctype in key_doctypes:
        notif = Notification(
            user_id=1, # Default to Admin (user_id=1)
            title=f"{doc.doctype} Submitted",
            message=f"{doc.doctype} {doc.name} has been formally submitted for processing.",
            type="Info",
            read=False,
            tenant_id=tenant_id
        )
        db.add(notif)
        print(f"🔔 Notification: {doc.doctype} submission alerted to Admin.")

def check_approval_rules(doc: BaseDocument, db: Session, tenant_id: int):
    """Automation logic (Phase 8): Example of high-value purchase approval rule."""
    if doc.doctype == "Purchase Order":
        grand_total = doc.get("total") or 0
        if grand_total > 50000:
            # This is an example. Real implementation would set workflow_state = "Pending Approval"
            print(f"⚠️ Approval Rule: {doc.name} is over 50,000. Needs manager approval.")
