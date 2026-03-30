from app.core.doc.base import BaseDocument

class Employee(BaseDocument):
    doctype: str = "Employee"

    def validate(self):
        if not self.get("name"):
            raise ValueError("Employee name is required.")

class Attendance(BaseDocument):
    doctype: str = "Attendance"

    def validate(self):
        if not self.get("employee_id"):
            raise ValueError("Employee ID is required for Attendance.")
        if not self.get("date"):
            raise ValueError("Attendance date is required.")

class SalarySlip(BaseDocument):
    doctype: str = "Salary Slip"

    def validate(self):
        if not self.get("employee_id"):
            raise ValueError("Employee ID is required for Salary Slip.")
        if not self.get("gross_pay"):
            raise ValueError("Gross pay is required.")
        
    def on_submit(self, db, tenant_id):
        """
        Submitting a Salary Slip triggers:
        - GL Entry for Expenses (Payroll Expense vs Payable).
        """
        super().on_submit()
        
        # Accounting integration (Simplified)
        from app.modules.accounts.engine import AccountingEngine
        acc = AccountingEngine(db, tenant_id)
        
        pay = self.get("net_pay")
        gl = [
            {"account": "5200", "debit": pay, "credit": 0, "description": f"Salary for {self.get('employee_id')}"},
            {"account": "2100", "debit": 0, "credit": pay, "description": f"Salary Payable"}
        ]
        acc.post_gl_entries(gl, self.doctype, self.name)
