import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Calendar, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const employees = [
  { id: "EMP-001", name: "Rahul Verma", role: "Sr. Technician", dept: "Installation", salary: "₹35,000", joining: "2022-03-15", status: "Active" },
  { id: "EMP-002", name: "Neha Gupta", role: "Sales Executive", dept: "Sales", salary: "₹28,000", joining: "2023-01-10", status: "Active" },
  { id: "EMP-003", name: "Kiran Patil", role: "Accountant", dept: "Finance", salary: "₹32,000", joining: "2022-07-20", status: "Active" },
  { id: "EMP-004", name: "Sunil Yadav", role: "Technician", dept: "Service", salary: "₹25,000", joining: "2023-06-01", status: "Active" },
  { id: "EMP-005", name: "Anjali Das", role: "HR Manager", dept: "HR", salary: "₹40,000", joining: "2021-11-05", status: "Active" },
  { id: "EMP-006", name: "Manoj Kumar", role: "Warehouse Mgr", dept: "Inventory", salary: "₹30,000", joining: "2022-09-12", status: "On Leave" },
];

export default function HRPage() {
  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR & Payroll</h1>
          <p className="text-sm text-muted-foreground">Employee management, attendance, and payroll</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Employee</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Employees</p></div><p className="text-xl font-bold mt-1">6</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">On Leave</p></div><p className="text-xl font-bold mt-1 text-warning">1</p></div>
        <div className="kpi-card"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Monthly Payroll</p></div><p className="text-xl font-bold mt-1">₹1,90,000</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Departments</p><p className="text-xl font-bold mt-1">5</p></div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Department</th><th>Salary</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs">{e.id}</td>
                  <td className="font-medium">{e.name}</td>
                  <td>{e.role}</td>
                  <td><Badge variant="secondary">{e.dept}</Badge></td>
                  <td className="font-semibold">{e.salary}</td>
                  <td className="text-muted-foreground">{e.joining}</td>
                  <td><span className={e.status === "Active" ? "status-badge status-active" : "status-badge status-warning"}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
