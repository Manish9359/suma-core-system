import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, ShoppingBag, Eye } from "lucide-react";
import { salesApi, api } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { Badge } from "@/components/ui/badge";

export default function SalesOrderPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: orders, isLoading, error, refetch } = useApiQuery(["sales", "orders"], () => salesApi.getOrders());

  const fields: RecordField[] = [
    { name: "customer", label: "Customer", type: "text", required: true },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "order_type", label: "Type", type: "select", options: ["Sales", "Service", "Maintenance"] },
    { name: "status", label: "Status", type: "select", options: ["Draft", "To Deliver", "Completed", "Cancelled"] }
  ];

  if (isLoading) return <div className="module-page"><LoadingState /></div>;
  if (error) return <div className="module-page"><ErrorState onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Orders</h1>
          <p className="text-sm text-muted-foreground">Manage order fulfillment and delivery schedules</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20">
          <Plus className="h-4 w-4" /> New Order
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-9 h-9" />
        </div>
      </div>

      {!orders || orders.length === 0 ? <EmptyState title="No orders found" /> : (
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <table className="data-table">
              <thead className="bg-muted/50">
                <tr><th>ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-accent/5 transition-colors">
                    <td className="font-mono text-xs">{o.id}</td>
                    <td className="font-semibold">{o.customer}</td>
                    <td className="text-sm">{o.date}</td>
                    <td className="font-bold">₹{o.total?.toLocaleString() || '0'}</td>
                    <td>
                      <Badge variant={o.status === "Completed" ? "default" : "secondary"}>
                        {o.status}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <RecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Create Sales Order"
        fields={fields}
        onSubmit={async (data) => {
          await salesApi.createOrder(data);
          refetch();
        }}
      />
    </div>
  );
}
