import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { purchasingApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";

const statusMap: Record<string, string> = {
  Ordered: "status-badge status-open",
  Received: "status-badge status-active",
  Partial: "status-badge status-warning",
};

export default function PurchasingPage() {
  const { data: orders, isLoading, error, refetch } = useApiQuery(["purchasing", "orders"], purchasingApi.getOrders);

  if (isLoading) return <div className="module-page"><LoadingState message="Loading orders..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load purchase orders" onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchasing</h1>
          <p className="text-sm text-muted-foreground">Vendors, purchase orders, and deliveries</p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />New Purchase Order</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-3.5 w-3.5" />Filter</Button>
      </div>

      {!orders || orders.length === 0 ? <EmptyState title="No purchase orders yet" /> : (
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <table className="data-table">
            <thead className="bg-muted/50"><tr><th>PO #</th><th>Vendor</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-accent/5 transition-colors">
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
      )}
    </div>
  );
}
