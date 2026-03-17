import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

const orders = [
  { id: "PO-2024-034", vendor: "Hikvision India", date: "2024-08-12", items: 5, total: "₹2,10,000", status: "Ordered" },
  { id: "PO-2024-033", vendor: "D-Link Distribution", date: "2024-08-08", items: 3, total: "₹42,000", status: "Received" },
  { id: "PO-2024-032", vendor: "Dahua Technology", date: "2024-08-05", items: 8, total: "₹1,68,000", status: "Partial" },
  { id: "PO-2024-031", vendor: "TP-Link India", date: "2024-08-01", items: 4, total: "₹56,000", status: "Received" },
];

const statusMap: Record<string, string> = {
  Ordered: "status-badge status-open",
  Received: "status-badge status-active",
  Partial: "status-badge status-warning",
};

export default function PurchasingPage() {
  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchasing</h1>
          <p className="text-sm text-muted-foreground">Vendors, purchase orders, and deliveries</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Purchase Order</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-3.5 w-3.5" />Filter</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="data-table">
            <thead><tr><th>PO #</th><th>Vendor</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs font-medium">{o.id}</td>
                  <td className="font-medium">{o.vendor}</td>
                  <td className="text-muted-foreground">{o.date}</td>
                  <td>{o.items}</td>
                  <td className="font-semibold">{o.total}</td>
                  <td><span className={statusMap[o.status]}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
