import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter, Truck, ShoppingCart, FileText, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { purchasingApi, inventoryApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";

const statusMap: Record<string, string> = {
  Ordered: "status-badge status-open",
  Received: "status-badge status-active",
  Partial: "status-badge status-warning",
};

export default function PurchasingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: orders, isLoading, error, refetch } = useApiQuery(["purchasing", "orders"], purchasingApi.getOrders);
  const { data: products } = useApiQuery(["inventory", "products"], inventoryApi.getProducts);

  const poFields: RecordField[] = [
    { name: "vendor", label: "Supplier / Vendor", type: "text", required: true },
    { name: "date", label: "PO Date", type: "date", required: true },
    { 
      name: "items", label: "Ordered Items", type: "table", required: true, 
      columns: [
        { name: "item_code", label: "Item", type: "select", options: products?.map((p: any) => ({ label: p.name, value: p.sku })) || [] },
        { name: "qty", label: "Quantity", type: "number" },
        { name: "rate", label: "Unit Price", type: "number" }
      ]
    }
  ];

  if (isLoading) return <div className="module-page"><LoadingState message="Loading orders..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load purchase orders" onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchasing</h1>
          <p className="text-sm text-muted-foreground">Manage material requests and supplier inflows</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />New Purchase Order</Button>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-background"><ShoppingCart className="h-4 w-4" />Purchase Orders</TabsTrigger>
          <TabsTrigger value="receipts" className="gap-2 data-[state=active]:bg-background"><Truck className="h-4 w-4" />Purchase Receipts</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders..." className="pl-9 h-9" />
            </div>
          </div>
          {!orders || orders.length === 0 ? <EmptyState title="No purchase orders yet" /> : (
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead className="bg-muted/50"><tr><th>PO #</th><th>Vendor</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-accent/5 transition-colors">
                        <td className="font-mono text-xs font-medium">{o.id}</td>
                        <td className="font-medium">{o.vendor}</td>
                        <td className="text-muted-foreground">{o.date}</td>
                        <td>{o.items}</td>
                        <td className="font-semibold">{o.total}</td>
                        <td><span className={statusMap[o.status]}>{o.status}</span></td>
                        <td className="text-right">
                          <Link to={`/print/purchase_order/${o.id}`} target="_blank">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-accent">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="receipts">
          <EmptyState title="No Purchase Receipts" description="Create receipts to record incoming goods from suppliers." />
        </TabsContent>
      </Tabs>

      <RecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Create Purchase Order"
        fields={poFields}
        onSubmit={async (data) => {
          await purchasingApi.createOrder(data);
          refetch();
        }}
      />
    </div>
  );
}
