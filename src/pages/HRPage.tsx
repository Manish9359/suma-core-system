import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, Calendar, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hrApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";

export default function HRPage() {
  const { data: employees, isLoading, error, refetch } = useApiQuery(["hr", "employees"], hrApi.getEmployees);
  const { data: summary } = useApiQuery(["hr", "summary"], hrApi.getSummary);

  if (isLoading) return <div className="module-page"><LoadingState message="Loading employees..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load HR data" onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR & Payroll</h1>
          <p className="text-sm text-muted-foreground">Employee management, attendance, and payroll</p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />Add Employee</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-sm"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><p className="text-xs text-muted-foreground font-medium">Total Employees</p></div><p className="text-2xl font-extrabold mt-1">{summary?.total_employees || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-warning" /><p className="text-xs text-muted-foreground font-medium">On Leave</p></div><p className="text-2xl font-extrabold mt-1 text-warning">{summary?.on_leave || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-success" /><p className="text-xs text-muted-foreground font-medium">Monthly Payroll</p></div><p className="text-2xl font-extrabold mt-1">{summary?.monthly_payroll || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-violet-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Departments</p><p className="text-2xl font-extrabold mt-1">{summary?.departments || 0}</p></div>
      </div>

      {!employees || employees.length === 0 ? <EmptyState title="No employees yet" /> : (
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <table className="data-table">
            <thead className="bg-muted/50"><tr><th>ID</th><th>Name</th><th>Role</th><th>Department</th><th>Salary</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-accent/5 transition-colors">
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
      )}
    </div>
  );
}
