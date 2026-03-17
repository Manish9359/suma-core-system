import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const invoices = [
  { id: "INV-2024-089", customer: "Tech Solutions Ltd", date: "2024-08-15", amount: "₹1,45,000", status: "Paid" },
  { id: "INV-2024-088", customer: "City Mall Management", date: "2024-08-12", amount: "₹3,20,000", status: "Pending" },
  { id: "INV-2024-087", customer: "Green Valley School", date: "2024-08-10", amount: "₹87,500", status: "Overdue" },
  { id: "INV-2024-086", customer: "SafeCity Solutions", date: "2024-08-08", amount: "₹2,15,000", status: "Paid" },
  { id: "INV-2024-085", customer: "EagleEye Securities", date: "2024-08-05", amount: "₹1,68,000", status: "Pending" },
];

const quotations = [
  { id: "QT-2024-045", customer: "WatchTower Corp", date: "2024-08-14", amount: "₹4,50,000", status: "Sent" },
  { id: "QT-2024-044", customer: "SecureHome Pvt Ltd", date: "2024-08-11", amount: "₹2,80,000", status: "Draft" },
];

const statusMap: Record<string, string> = {
  Paid: "status-badge status-active",
  Pending: "status-badge status-warning",
  Overdue: "status-badge bg-destructive/10 text-destructive",
  Sent: "status-badge status-open",
  Draft: "status-badge status-closed",
};

export default function SalesPage() {
  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="text-sm text-muted-foreground">Quotations, invoices, and payment tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <Button className="gap-2"><Plus className="h-4 w-4" />New Invoice</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total Invoiced</p><p className="text-xl font-bold mt-1">₹9,35,500</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Received</p><p className="text-xl font-bold mt-1 text-success">₹3,60,000</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-xl font-bold mt-1 text-warning">₹5,75,500</p></div>
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
        <Card>
          <CardContent className="p-0">
            <table className="data-table">
              <thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
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

        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quotations</h2>
        <Card>
          <CardContent className="p-0">
            <table className="data-table">
              <thead><tr><th>Quote #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/30">
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
      </div>
    </div>
  );
}
