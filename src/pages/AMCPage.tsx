import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, AlertCircle } from "lucide-react";

const contracts = [
  { id: "AMC-001", client: "Tech Solutions Ltd", equipment: "16 Cameras, 2 NVR", start: "2024-01-01", end: "2024-12-31", visits: "4/4", status: "Active" },
  { id: "AMC-002", client: "City Mall Management", equipment: "48 Cameras, 6 NVR, 4 Switches", start: "2024-03-15", end: "2025-03-14", visits: "2/4", status: "Active" },
  { id: "AMC-003", client: "Green Valley School", equipment: "12 Cameras, 1 DVR", start: "2024-02-01", end: "2025-01-31", visits: "3/4", status: "Active" },
  { id: "AMC-004", client: "SafeCity Solutions", equipment: "24 Cameras, 3 NVR", start: "2023-06-01", end: "2024-05-31", visits: "4/4", status: "Expired" },
  { id: "AMC-005", client: "WatchTower Corp", equipment: "8 Cameras, 1 NVR", start: "2024-07-01", end: "2025-06-30", visits: "0/4", status: "Due for Renewal" },
];

const statusMap: Record<string, string> = {
  Active: "status-badge status-active",
  Expired: "status-badge bg-destructive/10 text-destructive",
  "Due for Renewal": "status-badge status-warning",
};

export default function AMCPage() {
  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AMC Management</h1>
          <p className="text-sm text-muted-foreground">Annual maintenance contracts and service schedules</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Contract</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Active Contracts</p><p className="text-xl font-bold mt-1 text-success">3</p></div>
        <div className="kpi-card border-warning/30"><div className="flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-warning" /><p className="text-xs text-warning font-medium">Renewal Due</p></div><p className="text-xl font-bold mt-1 text-warning">1</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Expired</p><p className="text-xl font-bold mt-1 text-destructive">1</p></div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="data-table">
            <thead><tr><th>AMC #</th><th>Client</th><th>Equipment</th><th>Period</th><th>Visits</th><th>Status</th></tr></thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
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
    </div>
  );
}
