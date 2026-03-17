import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const installations = [
  { id: "INST-001", client: "Tech Solutions Ltd", site: "MG Road, Bangalore", devices: "16 IP Cameras, 2 NVR", team: "Rahul, Sunil", date: "2024-08-10", status: "Completed" },
  { id: "INST-002", client: "City Mall Management", site: "Phoenix Mall, Pune", devices: "48 Cameras, 6 NVR, 4 Switches", team: "Rahul, Sunil, Manoj", date: "2024-08-20", status: "In Progress" },
  { id: "INST-003", client: "Green Valley School", site: "Koramangala, Bangalore", devices: "12 Cameras, 1 DVR", team: "Sunil", date: "2024-08-25", status: "Scheduled" },
  { id: "INST-004", client: "WatchTower Corp", site: "Hinjewadi, Pune", devices: "8 Cameras, 1 NVR", team: "Rahul", date: "2024-09-01", status: "Scheduled" },
];

const statusMap: Record<string, string> = {
  Completed: "status-badge status-active",
  "In Progress": "status-badge status-warning",
  Scheduled: "status-badge status-open",
};

export default function InstallationsPage() {
  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Installations</h1>
          <p className="text-sm text-muted-foreground">CCTV installation projects and tracking</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Project</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="data-table">
            <thead><tr><th>Project #</th><th>Client</th><th>Site</th><th>Devices</th><th>Team</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {installations.map((inst) => (
                <tr key={inst.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs font-medium">{inst.id}</td>
                  <td className="font-medium">{inst.client}</td>
                  <td className="text-sm">{inst.site}</td>
                  <td className="text-xs">{inst.devices}</td>
                  <td>{inst.team}</td>
                  <td className="text-muted-foreground">{inst.date}</td>
                  <td><span className={statusMap[inst.status]}>{inst.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
