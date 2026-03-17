import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const accounts = [
  { code: "1000", name: "Cash", type: "Asset", balance: "₹3,45,000" },
  { code: "1100", name: "Bank Account - HDFC", type: "Asset", balance: "₹12,80,000" },
  { code: "1200", name: "Accounts Receivable", type: "Asset", balance: "₹5,75,500" },
  { code: "2000", name: "Accounts Payable", type: "Liability", balance: "₹2,10,000" },
  { code: "2100", name: "GST Payable", type: "Liability", balance: "₹1,24,000" },
  { code: "3000", name: "Revenue", type: "Income", balance: "₹24,56,000" },
  { code: "4000", name: "Cost of Goods Sold", type: "Expense", balance: "₹14,20,000" },
  { code: "4100", name: "Operating Expenses", type: "Expense", balance: "₹3,80,000" },
];

const typeColors: Record<string, string> = {
  Asset: "status-badge status-active",
  Liability: "status-badge status-warning",
  Income: "status-badge status-open",
  Expense: "status-badge bg-destructive/10 text-destructive",
};

export default function AccountingPage() {
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
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold mt-1 text-success">₹24,56,000</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-xl font-bold mt-1 text-destructive">₹18,00,000</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Net Profit</p><p className="text-xl font-bold mt-1">₹6,56,000</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">GST Payable</p><p className="text-xl font-bold mt-1 text-warning">₹1,24,000</p></div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Chart of Accounts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="data-table">
            <thead><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Balance</th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.code} className="hover:bg-muted/30">
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
    </div>
  );
}
