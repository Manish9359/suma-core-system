import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, Calendar, DollarSign, Clock, CreditCard, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hrApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HRPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [attModalOpen, setAttModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  
  const { data: employees, isLoading, error, refetch: refetchEmp } = useApiQuery(["hr", "employees"], hrApi.getEmployees);
  const { data: attendance, refetch: refetchAtt } = useApiQuery(["hr", "attendance"], hrApi.getAttendance);
  const { data: slips, refetch: refetchPay } = useApiQuery(["hr", "salary_slips"], hrApi.getSalarySlips);
  const { data: summary } = useApiQuery(["hr", "summary"], hrApi.getSummary);

  if (isLoading) return <div className="module-page"><LoadingState message="Loading HR module..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load HR data" onRetry={refetchEmp} /></div>;

  const empOptions = employees?.map((e: any) => ({ label: e.name, value: e.id })) || [];

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR & Payroll</h1>
          <p className="text-sm text-muted-foreground">Employee lifecycle, tracking and automated disbursements</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAttModalOpen(true)} variant="outline" className="gap-2"><Clock className="h-4 w-4" />Mark Attendance</Button>
          <Button onClick={() => setPayModalOpen(true)} variant="secondary" className="gap-2"><CreditCard className="h-4 w-4" />Process Payroll</Button>
          <Button onClick={() => { setEditingEmployee(null); setModalOpen(true); }} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />Add Employee</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-sm"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><p className="text-xs text-muted-foreground font-medium">Total Employees</p></div><p className="text-2xl font-extrabold mt-1">{summary?.total_employees || employees?.length || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-warning" /><p className="text-xs text-muted-foreground font-medium">On Leave</p></div><p className="text-2xl font-extrabold mt-1 text-warning">{summary?.on_leave || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-success" /><p className="text-xs text-muted-foreground font-medium">Monthly Payroll</p></div><p className="text-2xl font-extrabold mt-1">{summary?.monthly_payroll || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-violet-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Departments</p><p className="text-2xl font-extrabold mt-1">{summary?.departments || 0}</p></div>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="employees" className="gap-2 data-[state=active]:bg-background"><Users className="h-4 w-4" />Employees</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2 data-[state=active]:bg-background"><Clock className="h-4 w-4" />Attendance</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2 data-[state=active]:bg-background"><CreditCard className="h-4 w-4" />Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          {!employees || employees.length === 0 ? <EmptyState title="No employees yet" /> : (
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <table className="data-table">
                <thead className="bg-muted/50"><tr><th>ID</th><th>Name</th><th>Role</th><th>Department</th><th>Salary</th><th>Joined</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {employees.map((e: any) => (
                    <tr key={e.id} className="hover:bg-accent/5 transition-colors">
                      <td className="font-mono text-xs">{e.id}</td>
                      <td className="font-medium">{e.name}</td>
                      <td>{e.role}</td>
                      <td><Badge variant="secondary">{e.dept}</Badge></td>
                      <td className="font-semibold">₹{e.salary?.toLocaleString()}</td>
                      <td className="text-muted-foreground">{e.joining}</td>
                      <td><span className={e.status === "Active" ? "status-badge status-active" : "status-badge status-warning"}>{e.status}</span></td>
                      <td className="text-right flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingEmployee(e); setModalOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                          if (confirm(`Delete ${e.name}?`)) { await hrApi.deleteEmployee(e.id); refetchEmp(); }
                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="attendance">
          {!attendance || attendance.length === 0 ? <EmptyState title="No Attendance Logs" /> : (
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead className="bg-muted/50"><tr><th>Date</th><th>Employee</th><th>Status</th></tr></thead>
                  <tbody>
                    {attendance.map((a: any) => (
                      <tr key={a.id}>
                        <td>{a.date}</td>
                        <td className="font-medium">{a.employee_name}</td>
                        <td><Badge variant={a.status === "Absent" ? "destructive" : "outline"} className={a.status === "Present" ? "bg-success/10 text-success border-success/20" : ""}>{a.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payroll">
          {!slips || slips.length === 0 ? <EmptyState title="No Salary Slips" description="Manage monthly salary computations and automatic general ledger postings." /> : (
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead className="bg-muted/50"><tr><th>Slip ID</th><th>Employee</th><th>Period</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
                  <tbody>
                    {slips.map((s: any) => (
                      <tr key={s.id}>
                        <td className="font-mono text-xs text-muted-foreground">{s.id}</td>
                        <td className="font-medium">{s.employee_name}</td>
                        <td>{s.start_date} to {s.end_date}</td>
                        <td>₹{s.gross_pay?.toLocaleString()}</td>
                        <td className="text-destructive">₹{s.deductions?.toLocaleString()}</td>
                        <td className="font-bold text-success">₹{s.net_pay?.toLocaleString()}</td>
                        <td>
                          {s.status === 'Paid' ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 shadow-sm shadow-success/20">Paid</Badge>
                          ) : (
                            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={async () => {
                              await hrApi.updateSalarySlip(s.id, { status: "Paid" });
                              refetchPay();
                            }}>Mark Paid</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Employee Modal */}
      <RecordModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingEmployee(null); }}
        title={editingEmployee ? "Edit Employee" : "Add New Employee"}
        fields={[
          { name: "name", label: "Full Name", type: "text", required: true },
          { name: "role", label: "Designation/Role", type: "text", required: true },
          { name: "dept", label: "Department", type: "select", options: ["Engineering", "Sales", "Support", "HR", "Management"] },
          { name: "salary", label: "Salary (₹)", type: "number", required: true },
          { name: "joining", label: "Joining Date", type: "date", required: true }
        ]}
        initialData={editingEmployee || {}}
        onSubmit={async (data) => {
          if (editingEmployee) await hrApi.updateEmployee(editingEmployee.id, data);
          else await hrApi.createEmployee(data);
          refetchEmp();
          setModalOpen(false);
        }}
      />

      {/* Attendance Modal */}
      <RecordModal
        open={attModalOpen}
        onOpenChange={setAttModalOpen}
        title="Mark Attendance"
        fields={[
          { name: "employee_id", label: "Employee", type: "select", options: empOptions, required: true },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "status", label: "Status", type: "select", options: ["Present", "Absent", "Half Day"], required: true }
        ]}
        onSubmit={async (data) => {
          await hrApi.markAttendance(data);
          refetchAtt();
        }}
      />

      {/* Payroll Modal */}
      <RecordModal
        open={payModalOpen}
        onOpenChange={setPayModalOpen}
        title="Generate Salary Slip"
        fields={[
          { name: "employee_id", label: "Employee", type: "select", options: empOptions, required: true },
          { name: "start_date", label: "Start Date", type: "date", required: true },
          { name: "end_date", label: "End Date", type: "date", required: true },
          { name: "gross_pay", label: "Gross Salary (₹)", type: "number", required: true },
          { name: "deductions", label: "Deductions/Taxes (₹)", type: "number", required: true },
          { name: "net_pay", label: "Net Payable (₹)", type: "number", required: true },
          { name: "status", label: "Status", type: "select", options: ["Draft", "Paid"], required: true }
        ]}
        onSubmit={async (data) => {
          await hrApi.createSalarySlip(data);
          refetchPay();
        }}
      />
    </div>
  );
}
