import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, AlertTriangle, Trash2, History, Package, Building, MapPin, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { inventoryApi, warehouseApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InventoryPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [whModalOpen, setWhModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const { data: products, isLoading: prodLoading, error: prodErr, refetch: refetchProd } = useApiQuery(["inventory", "products"], inventoryApi.getProducts);
  const { data: warehouses, isLoading: whLoading, error: whErr, refetch: refetchWh } = useApiQuery(["inventory", "warehouses"], warehouseApi.getWarehouses);
  const { data: stockByWh } = useApiQuery(["inventory", "stock-by-warehouse"], inventoryApi.getStockByWarehouse);
  const { data: summary } = useApiQuery(["inventory", "summary"], inventoryApi.getSummary);
  const { data: ledger } = useApiQuery(["inventory", "ledger"], inventoryApi.getLedger);

  const warehouseOptions = warehouses?.map((w: any) => ({ label: w.name, value: w.id })) || [];

  if (prodLoading || whLoading) return <div className="module-page"><LoadingState message="Loading inventory..." /></div>;
  if (prodErr) return <div className="module-page"><ErrorState message="Failed to load inventory" onRetry={refetchProd} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory & Warehouses</h1>
          <p className="text-sm text-muted-foreground">Manage stock, storage locations, and transfers</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingWarehouse(null); setWhModalOpen(true); }} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Warehouse
          </Button>
          <Button onClick={() => { setEditingProduct(null); setModalOpen(true); }} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Total Products</p><p className="text-2xl font-extrabold mt-1">{summary?.total_products || products?.length || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Total Stock Value</p><p className="text-2xl font-extrabold mt-1">{summary?.stock_value || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-violet-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Warehouses</p><p className="text-2xl font-extrabold mt-1">{summary?.warehouses || warehouses?.length || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm">
          <div className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-warning" /><p className="text-xs text-warning font-medium">Low Stock Alerts</p></div>
          <p className="text-2xl font-extrabold mt-1 text-warning">{summary?.low_stock_count || 0}</p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-background"><Package className="h-4 w-4" />Products</TabsTrigger>
          <TabsTrigger value="warehouses" className="gap-2 data-[state=active]:bg-background"><Building className="h-4 w-4" />Warehouses</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2 data-[state=active]:bg-background"><History className="h-4 w-4" />Stock Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-3.5 w-3.5" />Filter</Button>
          </div>

          {!products || products.length === 0 ? <EmptyState title="No products yet" description="Add your first product to get started" /> : (
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead className="bg-muted/50"><tr><th>SKU</th><th>Product</th><th>Brand</th><th>Category</th><th>Cost</th><th>Sell</th><th>Stock</th><th>Warehouse</th><th>Actions</th></tr></thead>
                  <tbody>
                    {products.map((p: any) => (
                      <tr key={p.sku} className="hover:bg-accent/5 transition-colors">
                        <td className="font-mono text-xs">{p.sku}</td>
                        <td className="font-medium">{p.name}</td>
                        <td>{p.brand}</td>
                        <td><Badge variant="secondary">{p.category}</Badge></td>
                        <td>{p.cost}</td>
                        <td className="font-semibold">{p.sell}</td>
                        <td>
                          <span className={p.low ? "text-warning font-semibold" : ""}>
                            {p.low && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                            {p.stock}
                          </span>
                        </td>
                        <td>{p.warehouse}</td>
                        <td className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(p); setModalOpen(true); }}>Edit</Button>
                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={async () => {
                            if (confirm("Delete product?")) { await inventoryApi.deleteProduct(p.sku); refetchProd(); }
                          }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="warehouses">
          {!warehouses || warehouses.length === 0 ? <EmptyState title="No warehouses found" /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {warehouses.map((w: any) => {
                const stock = stockByWh?.filter((s: any) => s.warehouse === w.id) || [];
                return (
                  <Card key={w.id} className="border-none shadow-sm hover:shadow-md transition-shadow relative group">
                    <CardContent className="p-0">
                      <div className="p-5 border-b flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-accent/10"><Building className="h-5 w-5 text-accent" /></div>
                          <div>
                            <h3 className="font-semibold">{w.name}</h3>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{w.location || "No location set"}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingWarehouse(w); setWhModalOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">Live Stock</p>
                        {stock.length > 0 ? (
                          <div className="space-y-2">
                            {stock.map((s: any) => (
                              <div key={s.item_code} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs">
                                <span className="font-medium">{s.item_code}</span>
                                <span className="font-mono bg-accent/10 px-1.5 py-0.5 rounded text-accent">{s.actual_qty}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-2 px-1 italic">No stock in this warehouse</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ledger">
          {!ledger || ledger.length === 0 ? <EmptyState title="No stock movement recorded" /> : (
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead className="bg-muted/50"><tr><th>Date</th><th>Item</th><th>Warehouse</th><th>Qty Change</th><th>Reference</th></tr></thead>
                  <tbody>
                    {ledger.map((entry: any) => (
                      <tr key={entry.id}>
                        <td className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleString()}</td>
                        <td className="font-medium">{entry.item_code}</td>
                        <td>{entry.warehouse}</td>
                        <td className={entry.qty > 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                          {entry.qty > 0 ? `+${entry.qty}` : entry.qty}
                        </td>
                        <td className="text-xs font-mono">{entry.voucher_type}: {entry.voucher_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <RecordModal
        open={modalOpen}
        onOpenChange={(val) => { setModalOpen(val); if (!val) setEditingProduct(null); }}
        title={editingProduct ? "Edit Product" : "Add New Product"}
        initialData={editingProduct || {}}
        fields={[
          { name: "sku", label: "Item Code (SKU)", type: "text", required: true, disabled: !!editingProduct },
          { name: "name", label: "Item Name", type: "text", required: true },
          { name: "brand", label: "Brand", type: "text" },
          { name: "category", label: "Category", type: "select", options: ["Smart Switches", "Sensors", "Cameras", "Accessories"] },
          { name: "cost", label: "Cost Price (₹)", type: "number", required: true },
          { name: "sell", label: "Selling Price (₹)", type: "number", required: true },
          { name: "stock", label: "Current Stock", type: "number", required: true },
          { name: "warehouse", label: "Primary Warehouse", type: "select", options: warehouseOptions }
        ]}
        onSubmit={async (data) => {
          if (editingProduct) await inventoryApi.updateProduct(editingProduct.sku, data);
          else await inventoryApi.createProduct(data);
          refetchProd();
          setModalOpen(false);
        }}
      />

      <RecordModal
        open={whModalOpen}
        onOpenChange={(val) => { setWhModalOpen(val); if (!val) setEditingWarehouse(null); }}
        title={editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
        initialData={editingWarehouse || {}}
        fields={[
          { name: "id", label: "Warehouse ID", type: "text", required: true, disabled: !!editingWarehouse },
          { name: "name", label: "Warehouse Name", type: "text", required: true },
          { name: "location", label: "Location", type: "text" }
        ]}
        onSubmit={async (data) => {
          if (editingWarehouse) await warehouseApi.updateWarehouse(editingWarehouse.id, data);
          else await warehouseApi.createWarehouse(data);
          refetchWh();
          setWhModalOpen(false);
        }}
      />
    </div>
  );
}
