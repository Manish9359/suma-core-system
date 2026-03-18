import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Phone, Mail, Building2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { crmApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";

const statusColors: Record<string, string> = {
  New: "status-badge status-open",
  Contacted: "status-badge status-active",
  Qualified: "status-badge status-warning",
  Proposal: "status-badge bg-primary/10 text-primary",
};

export default function CRMPage() {
  const [tab, setTab] = useState<"leads" | "customers">("leads");
  const { data: leads, isLoading: leadsLoading, error: leadsError, refetch: refetchLeads } = useApiQuery(["crm", "leads"], crmApi.getLeads);
  const { data: customers, isLoading: customersLoading, error: customersError, refetch: refetchCustomers } = useApiQuery(["crm", "customers"], crmApi.getCustomers);

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="text-sm text-muted-foreground">Manage leads and customer relationships</p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 shadow-lg shadow-accent/20">
          <Plus className="h-4 w-4" />
          {tab === "leads" ? "Add Lead" : "Add Customer"}
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        <button onClick={() => setTab("leads")} className={`pb-2.5 px-5 text-sm font-medium border-b-2 transition-all ${tab === "leads" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Leads ({leads?.length || 0})
        </button>
        <button onClick={() => setTab("customers")} className={`pb-2.5 px-5 text-sm font-medium border-b-2 transition-all ${tab === "customers" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Customers ({customers?.length || 0})
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" /> Filter
        </Button>
      </div>

      {tab === "leads" ? (
        leadsLoading ? <LoadingState message="Loading leads..." /> :
        leadsError ? <ErrorState message="Failed to load leads" onRetry={refetchLeads} /> :
        !leads || leads.length === 0 ? <EmptyState title="No leads yet" description="Add your first lead to get started" /> : (
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <table className="data-table">
              <thead className="bg-muted/50">
                <tr>
                  <th>Name</th><th>Company</th><th>Contact</th><th>Source</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-accent/5 transition-colors">
                    <td className="font-medium">{l.name}</td>
                    <td><div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{l.company}</div></td>
                    <td>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{l.email}</span>
                      </div>
                    </td>
                    <td><Badge variant="secondary">{l.source}</Badge></td>
                    <td><span className={statusColors[l.status] || "status-badge"}>{l.status}</span></td>
                    <td><Button variant="ghost" size="sm" className="gap-1 text-xs text-accent hover:text-accent">Convert <ArrowRight className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        )
      ) : (
        customersLoading ? <LoadingState message="Loading customers..." /> :
        customersError ? <ErrorState message="Failed to load customers" onRetry={refetchCustomers} /> :
        !customers || customers.length === 0 ? <EmptyState title="No customers yet" description="Convert leads or add customers directly" /> : (
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <table className="data-table">
              <thead className="bg-muted/50">
                <tr><th>Customer ID</th><th>Company</th><th>Contact Person</th><th>GST Number</th></tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-accent/5 transition-colors">
                    <td className="font-mono text-xs">{c.id}</td>
                    <td className="font-medium">{c.company}</td>
                    <td>{c.contact}</td>
                    <td className="font-mono text-xs">{c.gst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        )
      )}
    </div>
  );
}
