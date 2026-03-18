import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { accountingApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";

const typeColors: Record<string, string> = {
  Asset: "status-badge status-active",
  Liability: "status-badge status-warning",
  Income: "status-badge status-open",
  Expense: "status-badge bg-destructive/10 text-destructive",
};

export default function AccountingPage() {
  const { data: accounts, isLoading, error, refetch } = useApiQuery(["accounting", "accounts"], accountingApi.getAccounts);
  const { data: summary } = useApiQuery(["accounting", "summary"], accountingApi.getSummary);

  if (isLoading) return <div className="module-page"><LoadingState message="Loading accounts..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load accounting data" onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounting</h1>
          <p className="text-sm text-muted-foreground">Chart of accounts, ledger, and financial reports</p>
        </div>
        <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export Reports</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Total Revenue</p><p className="text-2xl font-extrabold mt-1 text-success">{summary?.total_revenue || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-red-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Total Expenses</p><p className="text-2xl font-extrabold mt-1 text-destructive">{summary?.total_expenses || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Net Profit</p><p className="text-2xl font-extrabold mt-1">{summary?.net_profit || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">GST Payable</p><p className="text-2xl font-extrabold mt-1 text-warning">{summary?.gst_payable || "₹0"}</p></div>
      </div>

      {!accounts || accounts.length === 0 ? <EmptyState title="No accounts yet" /> : (
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="pb-2 bg-muted/30"><CardTitle className="text-base">Chart of Accounts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="data-table">
            <thead className="bg-muted/50"><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Balance</th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.code} className="hover:bg-accent/5 transition-colors">
                  <td className="font-mono text-xs">{a.code}</td>
                  <td className="font-medium">{a.name}</td>
                  <td><span className={typeColors[a.type]}>{a.type}</span></td>
                  <td className="font-semibold">{a.balance}</td>
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
