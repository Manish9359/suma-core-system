import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter, Truck, ShoppingCart, FileText, Printer, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { purchasingApi, inventoryApi, warehouseApi, supplierApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, string> = {
  Ordered: "status-badge status-open",
  Received: "status-badge status-active",
  Partial: "status-badge status-warning",
};

export default function PurchasingPage() {
  const [activeTab, setActiveTab] = useState("orders");
  const [modalOpen, setModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const { data: orders, isLoading: oLoad, error: oErr, refetch: refetchOrders } = useApiQuery(["purchasing", "orders"], purchasingApi.getOrders);
  const { data: receipts, isLoading: rLoad, refetch: refetchReceipts } = useApiQuery(["purchasing", "receipts"], purchasingApi.getReceipts);
  const { data: products } = useApiQuery(["inventory", "products"], inventoryApi.getProducts);
  const { data: warehouses } = useApiQuery(["inventory", "warehouses"], warehouseApi.getWarehouses);
  const { data: suppliers } = useApiQuery(["purchasing", "suppliers"], supplierApi.getSuppliers);

  const poFields: RecordField[] = [
    { name: "vendor", label: "Supplier / Vendor", type: "select", options: suppliers?.map((s) => s.name) || [], required: true },
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

  const receiptFields: RecordField[] = [
    { name: "supplier", label: "Supplier / Vendor", type: "select", options: suppliers?.map((s) => s.name) || [], required: true },
    { name: "date", label: "Receipt Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: ["Draft", "Completed"], required: true },
    { 
      name: "items", label: "Received Items", type: "table", required: true, 
      columns: [
        { name: "item_code", label: "Item", type: "select", options: products?.map((p: any) => ({ label: p.name, value: p.sku })) || [] },
        { name: "qty", label: "Accepted Qty", type: "number" },
        { name: "warehouse", label: "Target Warehouse", type: "select", options: warehouses?.map((w: any) => ({ label: w.name, value: w.name })) || ["Main"] },
      ]
    }
  ];

  if (oLoad) return <div className="module-page"><LoadingState message="Loading purchasing data..." /></div>;
  if (oErr) return <div className="module-page"><ErrorState message="Failed to load purchase data" onRetry={refetchOrders} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchasing</h1>
          <p className="text-sm text-muted-foreground">Manage material inbound flow, from PO to Goods Receipt</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "orders" ? (
            <Button onClick={() => setModalOpen(true)} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />New Purchase Order</Button>
          ) : (
            <Button onClick={() => setReceiptModalOpen(true)} className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-200"><PackageOpen className="h-4 w-4" />Log Materials Receipt</Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-background"><ShoppingCart className="h-4 w-4" />Purchase Orders</TabsTrigger>
          <TabsTrigger value="receipts" className="gap-2 data-[state=active]:bg-background"><Truck className="h-4 w-4" />Purchase Receipts (GRN)</TabsTrigger>
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
                        <td><span className={statusMap[o.status] || "status-badge status-draft"}>{o.status}</span></td>
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
          {!receipts || receipts.length === 0 ? (
            <EmptyState title="No Purchase Receipts" description="Log incoming inventory through a Goods Receipt Note (GRN) to instantly update warehouse stock." />
          ) : (
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead className="bg-muted/50"><tr><th>GRN #</th><th>Supplier</th><th>Date</th><th>Items Received</th><th>Target Warehouses</th><th>Status</th></tr></thead>
                  <tbody>
                    {receipts.map((r: any) => (
                      <tr key={r.id} className="hover:bg-accent/5 transition-colors">
                        <td className="font-mono text-xs font-medium">{r.id}</td>
                        <td className="font-medium">{r.supplier}</td>
                        <td className="text-muted-foreground">{r.date}</td>
                        <td>{r.items?.length || 0} items</td>
                        <td>
                          <div className="flex gap-1 flex-wrap">
                            {Array.from(new Set(r.items?.map((i:any) => i.warehouse))).map((wh: any) => (
                              <Badge key={wh} variant="outline" className="text-[10px]">{wh}</Badge>
                            ))}
                          </div>
                        </td>
                        <td><Badge variant={r.status === 'Completed' ? 'default' : 'secondary'}>{r.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* PO Modal */}
      <RecordModal open={modalOpen} onOpenChange={setModalOpen} title="Create Purchase Order" fields={poFields}
        onSubmit={async (data) => { await purchasingApi.createOrder(data); refetchOrders(); }}
      />

      {/* PR Modal */}
      <RecordModal open={receiptModalOpen} onOpenChange={setReceiptModalOpen} title="Material / Goods Receipt Note" fields={receiptFields}
        onSubmit={async (data) => { await purchasingApi.createReceipt(data); refetchReceipts(); }}
      />
    </div>
  );
}
