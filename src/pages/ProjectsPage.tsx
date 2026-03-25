import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, User, CheckCircle2, Circle } from "lucide-react";
import { projectsErpApi, crmApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";

export default function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: projects, isLoading, error, refetch } = useApiQuery(["projects", "all"], projectsErpApi.getProjects);
  const { data: customers } = useApiQuery(["crm", "customers"], crmApi.getCustomers);

  const fields: RecordField[] = [
    { name: "id", label: "Project ID", type: "text", required: true },
    { name: "name", label: "Project Name", type: "text", required: true },
    { name: "customer", label: "Customer", type: "select", options: customers?.map(c => ({ label: c.company, value: c.id })) || [] },
    { name: "start_date", label: "Start Date", type: "date" },
    { name: "end_date", label: "Expected End Date", type: "date" },
    { name: "status", label: "Status", type: "select", options: ["Draft", "Open", "On Hold", "Completed", "Cancelled"] }
  ];

  if (isLoading) return <div className="module-page"><LoadingState /></div>;
  if (error) return <div className="module-page"><ErrorState onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="text-sm text-muted-foreground">Plan and track customer projects and deliverables</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20">
          <Plus className="h-4 w-4" /> Start Project
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9 h-9" />
        </div>
      </div>

      {!projects || projects.length === 0 ? <EmptyState title="No active projects" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Card key={p.id} className="border-none shadow-md overflow-hidden hover:scale-[1.01] transition-transform">
              <CardContent className="p-0">
                <div className="p-5 border-b bg-muted/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg leading-none">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-tighter">{p.id}</p>
                    </div>
                    <span className={`status-badge ${p.status === 'Completed' ? 'status-active' : 'status-warning'}`}>{p.status}</span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Customer</p>
                      <p className="text-sm font-medium flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{p.customer || "Unassigned"}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Timeline</p>
                      <p className="text-sm font-medium flex items-center justify-end gap-1.5">{p.start_date || "—"} <Calendar className="h-3.5 w-3.5" /></p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-muted/50">
                     <p className="text-[10px] text-muted-foreground uppercase font-semibold">Status Progress</p>
                     <div className="h-2 w-full bg-accent/10 rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: p.status === 'Completed' ? '100%' : '30%' }}></div>
                     </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Initiate New Project"
        fields={fields}
        onSubmit={async (data) => {
          await projectsErpApi.createProject(data);
          refetch();
        }}
      />
    </div>
  );
}
