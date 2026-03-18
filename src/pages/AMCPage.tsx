import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, AlertCircle } from "lucide-react";
import { amcApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";

const statusMap: Record<string, string> = {
  Active: "status-badge status-active",
  Expired: "status-badge bg-destructive/10 text-destructive",
  "Due for Renewal": "status-badge status-warning",
};

export default function AMCPage() {
  const { data: contracts, isLoading, error, refetch } = useApiQuery(["amc", "contracts"], amcApi.getContracts);
  const { data: summary } = useApiQuery(["amc", "summary"], amcApi.getSummary);

  if (isLoading) return <div className="module-page"><LoadingState message="Loading contracts..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load AMC data" onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AMC Management</h1>
          <p className="text-sm text-muted-foreground">Annual maintenance contracts and service schedules</p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />New Contract</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Active Contracts</p><p className="text-2xl font-extrabold mt-1 text-success">{summary?.active || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm"><div className="flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-warning" /><p className="text-xs text-warning font-medium">Renewal Due</p></div><p className="text-2xl font-extrabold mt-1 text-warning">{summary?.renewal_due || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-red-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Expired</p><p className="text-2xl font-extrabold mt-1 text-destructive">{summary?.expired || 0}</p></div>
      </div>

      {!contracts || contracts.length === 0 ? <EmptyState title="No contracts yet" /> : (
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <table className="data-table">
            <thead className="bg-muted/50"><tr><th>AMC #</th><th>Client</th><th>Equipment</th><th>Period</th><th>Visits</th><th>Status</th></tr></thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-accent/5 transition-colors">
                  <td className="font-mono text-xs font-medium">{c.id}</td>
                  <td className="font-medium">{c.client}</td>
                  <td className="text-sm">{c.equipment}</td>
                  <td className="text-muted-foreground text-xs">{c.start} → {c.end}</td>
                  <td>{c.visits}</td>
                  <td><span className={statusMap[c.status]}>{c.status}</span></td>
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
