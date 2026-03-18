import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { serviceApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";

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
  const { data: tickets, isLoading, error, refetch } = useApiQuery(["service", "tickets"], serviceApi.getTickets);
  const { data: summary } = useApiQuery(["service", "summary"], serviceApi.getSummary);

  if (isLoading) return <div className="module-page"><LoadingState message="Loading tickets..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load service tickets" onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Tickets</h1>
          <p className="text-sm text-muted-foreground">Track and manage customer support issues</p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />New Ticket</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Open</p><p className="text-2xl font-extrabold mt-1 text-info">{summary?.open || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">In Progress</p><p className="text-2xl font-extrabold mt-1 text-warning">{summary?.in_progress || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Resolved</p><p className="text-2xl font-extrabold mt-1 text-success">{summary?.resolved || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-gray-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Closed</p><p className="text-2xl font-extrabold mt-1 text-muted-foreground">{summary?.closed || 0}</p></div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-3.5 w-3.5" />Filter</Button>
      </div>

      {!tickets || tickets.length === 0 ? <EmptyState title="No tickets yet" /> : (
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <table className="data-table">
            <thead className="bg-muted/50"><tr><th>Ticket #</th><th>Client</th><th>Issue</th><th>Priority</th><th>Technician</th><th>Status</th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-accent/5 transition-colors">
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
      )}
    </div>
  );
}
