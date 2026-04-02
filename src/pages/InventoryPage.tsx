import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, AlertTriangle, XCircle, CheckCircle2, Search, PlusCircle, Edit, Trash2, Warehouse, FileText, ArrowUpDown } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { api } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { toast } from "sonner";
import GenericModulePage from "./GenericModulePage";

function StockStatusBadge({ stock, reorder = 10 }: { stock: number; reorder?: number }) {
  if (stock <= 0) {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px] font-bold">
        <XCircle className="h-3 w-3" /> Out of Stock
      </Badge>
    );
  }
  if (stock <= reorder) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[10px] font-bold">
        <AlertTriangle className="h-3 w-3" /> Low Stock ({stock})
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px] font-bold">
      <CheckCircle2 className="h-3 w-3" /> In Stock ({stock})
    </Badge>
  );
}

function ProductCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<any>(null);
  const [stockQty, setStockQty] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const { data: meta, isLoading: metaLoading } = useApiQuery(
    ["meta", "Product"],
    () => api.get<any>("/api/v1/doc/meta/Product")
  );
  const { data: products, isLoading, error, refetch } = useApiQuery(
    ["doc", "Product"],
    () => api.get<any[]>("/api/v1/doc/Product")
  );

  if (isLoading || metaLoading) return <LoadingState message="Loading products..." />;
  if (error) return <ErrorState message="Failed to load products" onRetry={refetch} />;

  const allProducts = Array.isArray(products) ? products : [];
  
  const filtered = allProducts.filter((p) => {
    const matchesSearch = Object.values(p).some((v) =>
      String(v).toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (!matchesSearch) return false;
    const stock = Number(p.stock || p.qty || 0);
    if (filter === "out") return stock <= 0;
    if (filter === "low") return stock > 0 && stock <= Number(p.reorder_level || 10);
    return true;
  });

  const totalProducts = allProducts.length;
  const outOfStock = allProducts.filter((p) => Number(p.stock || p.qty || 0) <= 0).length;
  const lowStock = allProducts.filter((p) => {
    const s = Number(p.stock || p.qty || 0);
    return s > 0 && s <= Number(p.reorder_level || 10);
  }).length;
  const inStock = totalProducts - outOfStock - lowStock;

  const fields: RecordField[] = (meta?.fields || [])
    .filter((f: any) => f.name !== "id" && f.name !== "tenant_id")
    .map((f: any) => ({
      name: f.name,
      label: f.label || f.name,
      type: f.fieldtype?.toLowerCase() === "int" || f.fieldtype?.toLowerCase() === "float" ? "number" : "text",
      required: !!f.required,
      disabled: !!f.readonly,
    }));

  const handleSave = async (data: any) => {
    try {
      const id = editingRecord?.id || editingRecord?.sku;
      if (id) {
        await api.put(`/api/v1/doc/Product/${id}`, data);
        toast.success("Product updated");
      } else {
        await api.post("/api/v1/doc/Product", data);
        toast.success("Product created");
      }
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this product?")) {
      try {
        await api.delete(`/api/v1/doc/Product/${id}`);
        toast.success("Product deleted");
        refetch();
      } catch (e: any) {
        toast.error(e.message || "Delete failed");
      }
    }
  };

  const handleManualStock = async () => {
    if (!stockItem || !stockQty) return;
    try {
      const id = stockItem.id || stockItem.sku;
      const newQty = Number(stockItem.stock || stockItem.qty || 0) + Number(stockQty);
      await api.put(`/api/v1/doc/Product/${id}`, { ...stockItem, stock: newQty });
      toast.success(`Stock updated: ${stockItem.name || id} → ${newQty} units`);
      setStockModalOpen(false);
      setStockQty("");
      setStockItem(null);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Stock update failed");
    }
  };

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" /> Product Catalog
            <Badge variant="secondary" className="text-xs">{totalProducts}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Manage products, stock levels, and pricing</p>
        </div>
        <Button onClick={() => { setEditingRecord(null); setModalOpen(true); }} className="gap-2 shadow-sm">
          <PlusCircle className="h-4 w-4" /> New Product
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("all")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-extrabold">{totalProducts}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Total Products</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("all")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-700">{inStock}</p>
              <p className="text-[11px] text-muted-foreground font-medium">In Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("low")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-amber-700">{lowStock}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Low Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("out")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-destructive">{outOfStock}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Out of Stock</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Search */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="py-3 px-5 border-b bg-card">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9 h-9 bg-muted/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              {(["all", "low", "out"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f === "low" ? "⚠ Low" : "✕ Out"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU / Code</th>
                  <th>Category</th>
                  <th className="text-right">Cost (₹)</th>
                  <th className="text-right">Sell (₹)</th>
                  <th className="text-center">Stock</th>
                  <th className="text-center">Status</th>
                  <th className="text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm">{filter !== "all" ? `No ${filter === "low" ? "low stock" : "out of stock"} items` : "No products found"}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p: any) => {
                    const stock = Number(p.stock || p.qty || 0);
                    const id = p.id || p.sku;
                    return (
                      <tr key={id} className="cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => { setEditingRecord(p); setModalOpen(true); }}>
                        <td className="font-semibold">{p.name || p.item_name || id}</td>
                        <td className="font-mono text-xs text-muted-foreground">{id}</td>
                        <td>{p.category || p.brand || "—"}</td>
                        <td className="text-right font-mono">{Number(p.cost || 0).toLocaleString("en-IN")}</td>
                        <td className="text-right font-mono">{Number(p.sell || p.selling_price || 0).toLocaleString("en-IN")}</td>
                        <td className="text-center font-bold">{stock}</td>
                        <td className="text-center">
                          <StockStatusBadge stock={stock} reorder={Number(p.reorder_level || 10)} />
                        </td>
                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              title="Add Stock Manually"
                              onClick={() => { setStockItem(p); setStockQty(""); setStockModalOpen(true); }}
                            >
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => { setEditingRecord(p); setModalOpen(true); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Manual Stock Adjustment Dialog */}
      {stockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setStockModalOpen(false)}>
          <div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Adjust Stock</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {stockItem?.name || stockItem?.id} — Current: <span className="font-bold">{Number(stockItem?.stock || stockItem?.qty || 0)}</span>
            </p>
            <div className="space-y-3">
              <Input
                type="number"
                placeholder="Enter qty to add (use negative to subtract)"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setStockModalOpen(false)}>Cancel</Button>
                <Button onClick={handleManualStock} disabled={!stockQty}>
                  Update Stock
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <RecordModal
        open={modalOpen}
        onOpenChange={(v: boolean) => { setModalOpen(v); if (!v) refetch(); }}
        title={editingRecord ? `Edit Product — ${editingRecord.name || editingRecord.id}` : "New Product"}
        fields={fields}
        initialData={editingRecord}
        onSubmit={handleSave}
        doctype="Product"
      />
    </div>
  );
}

export default function InventoryPage() {
  const [tab, setTab] = useState<"products" | "warehouses">("products");

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 border-b px-6 pt-3 bg-card">
        <button
          onClick={() => setTab("products")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
            tab === "products" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Products & Stock
        </button>
        <button
          onClick={() => setTab("warehouses")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
            tab === "warehouses" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Warehouses
        </button>
      </div>
      <div className="flex-1 relative overflow-auto">
        {tab === "products" ? (
          <ProductCatalog />
        ) : (
          <GenericModulePage doctype="Warehouse" title="Warehouses" description="Manage storage locations" />
        )}
      </div>
    </div>
  );
}
