import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, AlertTriangle, XCircle, CheckCircle2, Search, PlusCircle, Edit, Trash2, ArrowUpDown, Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { localStore, LocalProduct } from "@/lib/localStore";

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

function ProductForm({ product, warehouses, onSave, onCancel }: {
  product: Partial<LocalProduct> | null;
  warehouses: any[];
  onSave: (data: Partial<LocalProduct>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<LocalProduct>>(product || {
    name: "", sku: "", category: "", brand: "", warehouse: "WH-001",
    cost: 0, sell: 0, stock: 0, reorder_level: 10, hsn_code: "", unit: "Nos"
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{product?.id ? "Edit Product" : "New Product"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Product Name *</label>
            <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Hikvision 2MP Dome Camera" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">SKU / Code</label>
            <Input value={form.sku || ""} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. HIK-2MP-DOME" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Select value={form.category || ""} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {["CCTV Camera", "DVR/NVR", "Hard Disk", "Cable", "Connector", "Switch", "Router", "UPS", "Software", "Accessory", "Other"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Brand</label>
            <Input value={form.brand || ""} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Hikvision" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Warehouse</label>
            <Select value={form.warehouse || "WH-001"} onValueChange={(v) => set("warehouse", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {warehouses.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cost Price (₹)</label>
            <Input type="number" value={form.cost || ""} onChange={(e) => set("cost", Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Selling Price (₹)</label>
            <Input type="number" value={form.sell || ""} onChange={(e) => set("sell", Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Opening Stock</label>
            <Input type="number" value={form.stock || ""} onChange={(e) => set("stock", Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reorder Level</label>
            <Input type="number" value={form.reorder_level || ""} onChange={(e) => set("reorder_level", Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">HSN Code</label>
            <Input value={form.hsn_code || ""} onChange={(e) => set("hsn_code", e.target.value)} placeholder="e.g. 85258090" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Unit</label>
            <Select value={form.unit || "Nos"} onValueChange={(v) => set("unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Nos", "Pcs", "Mtr", "Kg", "Box", "Set", "Pair"].map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => { if (!form.name) { toast.error("Product name is required"); return; } onSave(form); }} disabled={!form.name}>
            {product?.id ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductCatalog() {
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<LocalProduct> | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<LocalProduct | null>(null);
  const [stockQty, setStockQty] = useState("");

  const reload = useCallback(() => {
    setProducts(localStore.getProducts());
    setWarehouses(localStore.getWarehouses());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = products.filter((p) => {
    const matchesSearch = [p.name, p.sku, p.category, p.brand, p.warehouse]
      .some((v) => (v || "").toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (filter === "out") return p.stock <= 0;
    if (filter === "low") return p.stock > 0 && p.stock <= (p.reorder_level || 10);
    return true;
  });

  const totalProducts = products.length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= (p.reorder_level || 10)).length;
  const inStock = totalProducts - outOfStock - lowStock;

  const handleSave = (data: Partial<LocalProduct>) => {
    try {
      if (editingProduct?.id) {
        localStore.updateProduct(editingProduct.id, data);
        toast.success("Product updated successfully");
      } else {
        localStore.createProduct(data);
        toast.success("Product created successfully");
      }
      setFormOpen(false);
      setEditingProduct(null);
      reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to save product");
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this product permanently?")) {
      localStore.deleteProduct(id);
      toast.success("Product deleted");
      reload();
    }
  };

  const handleManualStock = () => {
    if (!stockItem || !stockQty) return;
    try {
      localStore.adjustStock(stockItem.id, Number(stockQty));
      toast.success(`Stock updated: ${stockItem.name} → ${stockItem.stock + Number(stockQty)} units`);
      setStockModalOpen(false);
      setStockQty("");
      setStockItem(null);
      reload();
    } catch (e: any) {
      toast.error(e.message || "Stock update failed");
    }
  };

  const warehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name || id;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" /> Product Catalog
            <Badge variant="secondary" className="text-xs">{totalProducts}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Manage products, stock levels, and pricing</p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setFormOpen(true); }} className="gap-2 shadow-sm">
          <PlusCircle className="h-4 w-4" /> New Product
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Products", value: totalProducts, icon: Package, color: "text-primary", bg: "bg-primary/10", onClick: () => setFilter("all") },
          { label: "In Stock", value: inStock, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10", onClick: () => setFilter("all") },
          { label: "Low Stock", value: lowStock, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10", onClick: () => setFilter("low") },
          { label: "Out of Stock", value: outOfStock, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", onClick: () => setFilter("out") },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={kpi.onClick}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + Search + Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="py-3 px-5 border-b bg-card">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-9 h-9 bg-muted/30" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex gap-1.5">
              {(["all", "low", "out"] as const).map((f) => (
                <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm" className="text-xs h-8" onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "low" ? "⚠ Low" : "✕ Out"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-semibold">Product</th>
                  <th className="text-left p-3 font-semibold">SKU</th>
                  <th className="text-left p-3 font-semibold">Category</th>
                  <th className="text-left p-3 font-semibold">Warehouse</th>
                  <th className="text-right p-3 font-semibold">Cost (₹)</th>
                  <th className="text-right p-3 font-semibold">Sell (₹)</th>
                  <th className="text-center p-3 font-semibold">Stock</th>
                  <th className="text-center p-3 font-semibold">Status</th>
                  <th className="text-right p-3 font-semibold w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm">{products.length === 0 ? 'No products yet — click "New Product" to add one' : "No matching products"}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => { setEditingProduct(p); setFormOpen(true); }}>
                      <td className="p-3 font-semibold">{p.name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="p-3">{p.category || "—"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] font-mono">{warehouseName(p.warehouse)}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono">{Number(p.cost).toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right font-mono">{Number(p.sell).toLocaleString("en-IN")}</td>
                      <td className="p-3 text-center font-bold">{p.stock}</td>
                      <td className="p-3 text-center">
                        <StockStatusBadge stock={p.stock} reorder={p.reorder_level || 10} />
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Adjust Stock"
                            onClick={() => { setStockItem(p); setStockQty(""); setStockModalOpen(true); }}>
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => { setEditingProduct(p); setFormOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Adjustment Modal */}
      {stockModalOpen && stockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setStockModalOpen(false)}>
          <div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Adjust Stock</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {stockItem.name} — Current: <span className="font-bold">{stockItem.stock}</span>
            </p>
            <Input type="number" placeholder="Enter qty to add (negative to subtract)" value={stockQty} onChange={(e) => setStockQty(e.target.value)} autoFocus />
            {stockQty && (
              <p className="text-xs mt-2 text-muted-foreground">
                New stock will be: <span className="font-bold text-foreground">{stockItem.stock + Number(stockQty)}</span>
              </p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="ghost" onClick={() => setStockModalOpen(false)}>Cancel</Button>
              <Button onClick={handleManualStock} disabled={!stockQty}>Update Stock</Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {formOpen && (
        <ProductForm
          product={editingProduct}
          warehouses={warehouses}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
}

function StockLedgerView() {
  const ledger = localStore.getStockLedger();
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Stock Ledger</h2>
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left p-3">Date</th><th className="text-left p-3">Item</th>
              <th className="text-left p-3">Warehouse</th><th className="text-right p-3">Qty</th>
              <th className="text-left p-3">Voucher</th><th className="text-left p-3">Ref</th>
            </tr></thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No stock movements recorded yet</td></tr>
              ) : ledger.map((e: any, i: number) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-3">{e.date}</td>
                  <td className="p-3 font-mono text-xs">{e.item_code}</td>
                  <td className="p-3">{e.warehouse}</td>
                  <td className={`p-3 text-right font-bold ${e.qty > 0 ? "text-emerald-600" : "text-destructive"}`}>{e.qty > 0 ? `+${e.qty}` : e.qty}</td>
                  <td className="p-3">{e.voucher_type}</td>
                  <td className="p-3 font-mono text-xs">{e.voucher_no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function WarehouseBalances() {
  const products = localStore.getProducts();
  const warehouses = localStore.getWarehouses();

  const balances = warehouses.map((wh: any) => {
    const whProducts = products.filter((p) => p.warehouse === wh.id);
    return {
      ...wh,
      items: whProducts.length,
      totalQty: whProducts.reduce((s, p) => s + p.stock, 0),
      totalValue: whProducts.reduce((s, p) => s + p.stock * p.cost, 0),
    };
  });

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Warehouse Balances</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {balances.map((wh) => (
          <Card key={wh.id} className="shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-bold text-base">{wh.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{wh.location}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-bold">{wh.items}</p><p className="text-[10px] text-muted-foreground">Items</p></div>
                <div><p className="text-lg font-bold">{wh.totalQty}</p><p className="text-[10px] text-muted-foreground">Total Qty</p></div>
                <div><p className="text-lg font-bold">₹{wh.totalValue.toLocaleString("en-IN")}</p><p className="text-[10px] text-muted-foreground">Value</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WarehouseList() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => { setWarehouses(localStore.getWarehouses()); }, []);

  const handleAdd = () => {
    if (!name) { toast.error("Name required"); return; }
    localStore.createWarehouse({ name, location });
    setWarehouses(localStore.getWarehouses());
    setName(""); setLocation("");
    toast.success("Warehouse added");
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold">Warehouses</h2>
      <div className="flex gap-3 items-end">
        <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse name" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Location</label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City" /></div>
        <Button onClick={handleAdd} className="gap-1"><PlusCircle className="h-4 w-4" /> Add</Button>
      </div>
      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left p-3">ID</th><th className="text-left p-3">Name</th><th className="text-left p-3">Location</th>
            </tr></thead>
            <tbody>
              {warehouses.map((w: any) => (
                <tr key={w.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{w.id}</td><td className="p-3 font-semibold">{w.name}</td><td className="p-3">{w.location || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InventoryPage() {
  const [tab, setTab] = useState<"products" | "warehouses" | "ledger" | "bins">("products");

  const tabs = [
    { key: "products" as const, label: "Products & Stock" },
    { key: "warehouses" as const, label: "Warehouses" },
    { key: "ledger" as const, label: "Stock Ledger" },
    { key: "bins" as const, label: "Warehouse Balances" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 border-b px-6 pt-3 bg-card">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 relative overflow-auto">
        {tab === "products" ? <ProductCatalog /> :
         tab === "warehouses" ? <WarehouseList /> :
         tab === "ledger" ? <StockLedgerView /> :
         <WarehouseBalances />}
      </div>
    </div>
  );
}
