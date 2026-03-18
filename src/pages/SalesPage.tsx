import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download } from "lucide-react";
import { salesApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";

const statusMap: Record<string, string> = {
  Paid: "status-badge status-active",
  Pending: "status-badge status-warning",
  Overdue: "status-badge bg-destructive/10 text-destructive",
  Sent: "status-badge status-open",
  Draft: "status-badge status-closed",
};

export default function SalesPage() {
  const { data: invoices, isLoading: invLoading, error: invError, refetch: refetchInv } = useApiQuery(["sales", "invoices"], salesApi.getInvoices);
  const { data: quotations } = useApiQuery(["sales", "quotations"], salesApi.getQuotations);
  const { data: summary } = useApiQuery(["sales", "summary"], salesApi.getSummary);

  if (invLoading) return <div className="module-page"><LoadingState message="Loading sales..." /></div>;
  if (invError) return <div className="module-page"><ErrorState message="Failed to load sales data" onRetry={refetchInv} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="text-sm text-muted-foreground">Quotations, invoices, and payment tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />New Invoice</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Total Invoiced</p>
          <p className="text-2xl font-extrabold mt-1">{summary?.total_invoiced || "₹0"}</p>
        </div>
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Received</p>
          <p className="text-2xl font-extrabold mt-1 text-success">{summary?.received || "₹0"}</p>
        </div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Outstanding</p>
          <p className="text-2xl font-extrabold mt-1 text-warning">{summary?.outstanding || "₹0"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-3.5 w-3.5" />Filter</Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Invoices</h2>
        {!invoices || invoices.length === 0 ? <EmptyState title="No invoices yet" /> : (
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <table className="data-table">
              <thead className="bg-muted/50"><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-accent/5 transition-colors">
                    <td className="font-mono text-xs font-medium">{inv.id}</td>
                    <td>{inv.customer}</td>
                    <td className="text-muted-foreground">{inv.date}</td>
                    <td className="font-semibold">{inv.amount}</td>
                    <td><span className={statusMap[inv.status]}>{inv.status}</span></td>
                    <td><Button variant="ghost" size="sm" className="text-xs">View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        )}

        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quotations</h2>
        {!quotations || quotations.length === 0 ? <EmptyState title="No quotations yet" /> : (
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <table className="data-table">
              <thead className="bg-muted/50"><tr><th>Quote #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-accent/5 transition-colors">
                    <td className="font-mono text-xs font-medium">{q.id}</td>
                    <td>{q.customer}</td>
                    <td className="text-muted-foreground">{q.date}</td>
                    <td className="font-semibold">{q.amount}</td>
                    <td><span className={statusMap[q.status]}>{q.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
