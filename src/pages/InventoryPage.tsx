import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { inventoryApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";

export default function InventoryPage() {
  const { data: products, isLoading, error, refetch } = useApiQuery(["inventory", "products"], inventoryApi.getProducts);
  const { data: summary } = useApiQuery(["inventory", "summary"], inventoryApi.getSummary);

  if (isLoading) return <div className="module-page"><LoadingState message="Loading inventory..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load inventory" onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage stock, products, and warehouse transfers</p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />Add Product</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Total Products</p><p className="text-2xl font-extrabold mt-1">{summary?.total_products || products?.length || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Total Stock Value</p><p className="text-2xl font-extrabold mt-1">{summary?.stock_value || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-violet-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Warehouses</p><p className="text-2xl font-extrabold mt-1">{summary?.warehouses || 0}</p></div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm">
          <div className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-warning" /><p className="text-xs text-warning font-medium">Low Stock Alerts</p></div>
          <p className="text-2xl font-extrabold mt-1 text-warning">{summary?.low_stock_count || 0}</p>
        </div>
      </div>

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
            <thead className="bg-muted/50"><tr><th>SKU</th><th>Product</th><th>Brand</th><th>Category</th><th>Cost</th><th>Sell</th><th>Stock</th><th>Warehouse</th></tr></thead>
            <tbody>
              {products.map((p) => (
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
