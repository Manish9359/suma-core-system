import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const tickets = [
  { id: "TKT-156", client: "Tech Solutions Ltd", issue: "DVR not recording", priority: "High", technician: "Rahul Verma", status: "Resolved" },
  { id: "TKT-155", client: "City Mall Management", issue: "Camera offline - Zone B", priority: "Critical", technician: "Sunil Yadav", status: "In Progress" },
  { id: "TKT-154", client: "Green Valley School", issue: "Night vision issue", priority: "Medium", technician: "Rahul Verma", status: "Assigned" },
  { id: "TKT-153", client: "SafeCity Solutions", issue: "Network switch failure", priority: "High", technician: "—", status: "Open" },
  { id: "TKT-152", client: "EagleEye Securities", issue: "Motion detection sensitivity", priority: "Low", technician: "Sunil Yadav", status: "Closed" },
];

const priorityColors: Record<string, string> = {
  Critical: "bg-destructive/10 text-destructive",
  High: "bg-warning/10 text-warning",
  Medium: "bg-info/10 text-info",
  Low: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  Open: "status-badge status-open",
  Assigned: "status-badge bg-primary/10 text-primary",
  "In Progress": "status-badge status-warning",
  Resolved: "status-badge status-active",
  Closed: "status-badge status-closed",
};

export default function ServicePage() {
  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Tickets</h1>
          <p className="text-sm text-muted-foreground">Track and manage customer support issues</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Ticket</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Open</p><p className="text-xl font-bold mt-1 text-info">1</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-xl font-bold mt-1 text-warning">2</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Resolved</p><p className="text-xl font-bold mt-1 text-success">1</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Closed</p><p className="text-xl font-bold mt-1 text-muted-foreground">1</p></div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-3.5 w-3.5" />Filter</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="data-table">
            <thead><tr><th>Ticket #</th><th>Client</th><th>Issue</th><th>Priority</th><th>Technician</th><th>Status</th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs font-medium">{t.id}</td>
                  <td>{t.client}</td>
                  <td className="font-medium">{t.issue}</td>
                  <td><span className={`status-badge ${priorityColors[t.priority]}`}>{t.priority}</span></td>
                  <td>{t.technician}</td>
                  <td><span className={statusColors[t.status]}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
