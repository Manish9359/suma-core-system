import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const products = [
  { sku: "CAM-IP-001", name: "IP Dome Camera 4MP", brand: "Hikvision", category: "CCTV Cameras", cost: "₹4,200", sell: "₹6,500", stock: 45, warehouse: "Main" },
  { sku: "CAM-BUL-002", name: "Bullet Camera 2MP", brand: "Dahua", category: "CCTV Cameras", cost: "₹2,800", sell: "₹4,200", stock: 32, warehouse: "Main" },
  { sku: "NVR-16CH-001", name: "16 Channel NVR", brand: "Hikvision", category: "DVR/NVR", cost: "₹12,500", sell: "₹18,000", stock: 8, warehouse: "Main" },
  { sku: "CAB-CAT6-001", name: "CAT6 Cable (305m)", brand: "D-Link", category: "Cables", cost: "₹3,500", sell: "₹5,000", stock: 3, warehouse: "Store B", low: true },
  { sku: "SW-POE-001", name: "8-Port PoE Switch", brand: "TP-Link", category: "Networking", cost: "₹5,600", sell: "₹8,200", stock: 2, warehouse: "Main", low: true },
  { sku: "HDD-4TB-001", name: "4TB Surveillance HDD", brand: "Seagate", category: "Accessories", cost: "₹7,800", sell: "₹10,500", stock: 15, warehouse: "Main" },
];

export default function InventoryPage() {
  const lowStockCount = products.filter(p => (p as any).low).length;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage stock, products, and warehouse transfers</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Product</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total Products</p><p className="text-xl font-bold mt-1">{products.length}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total Stock Value</p><p className="text-xl font-bold mt-1">₹8,42,500</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Warehouses</p><p className="text-xl font-bold mt-1">2</p></div>
        <div className="kpi-card border-warning/30">
          <div className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-warning" /><p className="text-xs text-warning font-medium">Low Stock Alerts</p></div>
          <p className="text-xl font-bold mt-1 text-warning">{lowStockCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-3.5 w-3.5" />Filter</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="data-table">
            <thead><tr><th>SKU</th><th>Product</th><th>Brand</th><th>Category</th><th>Cost</th><th>Sell</th><th>Stock</th><th>Warehouse</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.sku} className="hover:bg-muted/30">
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.brand}</td>
                  <td><Badge variant="secondary">{p.category}</Badge></td>
                  <td>{p.cost}</td>
                  <td className="font-semibold">{p.sell}</td>
                  <td>
                    <span className={(p as any).low ? "text-warning font-semibold" : ""}>
                      {(p as any).low && <AlertTriangle className="inline h-3 w-3 mr-1" />}
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
    </div>
  );
}
