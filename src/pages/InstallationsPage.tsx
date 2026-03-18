import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { installationApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";

const statusMap: Record<string, string> = {
  Completed: "status-badge status-active",
  "In Progress": "status-badge status-warning",
  Scheduled: "status-badge status-open",
};

export default function InstallationsPage() {
  const { data: installations, isLoading, error, refetch } = useApiQuery(["installations", "projects"], installationApi.getProjects);

  if (isLoading) return <div className="module-page"><LoadingState message="Loading projects..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load installations" onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Installations</h1>
          <p className="text-sm text-muted-foreground">CCTV installation projects and tracking</p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />New Project</Button>
      </div>

      {!installations || installations.length === 0 ? <EmptyState title="No installation projects yet" /> : (
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <table className="data-table">
            <thead className="bg-muted/50"><tr><th>Project #</th><th>Client</th><th>Site</th><th>Devices</th><th>Team</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {installations.map((inst) => (
                <tr key={inst.id} className="hover:bg-accent/5 transition-colors">
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
      )}
    </div>
  );
}
