// localStorage-based data store for offline/no-backend mode

export interface LocalProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  warehouse: string;
  cost: number;
  sell: number;
  stock: number;
  reorder_level: number;
  hsn_code: string;
  unit: string;
}

const PRODUCTS_KEY = "suma_products";
const WAREHOUSES_KEY = "suma_warehouses";
const STOCK_LEDGER_KEY = "suma_stock_ledger";

function getItems<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setItems<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

// Seed default warehouses if empty
function ensureWarehouses() {
  const wh = getItems<any>(WAREHOUSES_KEY);
  if (wh.length === 0) {
    setItems(WAREHOUSES_KEY, [
      { id: "WH-001", name: "Main Warehouse", location: "Pune" },
      { id: "WH-002", name: "Branch Store", location: "Mumbai" },
    ]);
  }
}

export const localStore = {
  // Products
  getProducts: (): LocalProduct[] => getItems<LocalProduct>(PRODUCTS_KEY),

  getProduct: (id: string): LocalProduct | undefined =>
    getItems<LocalProduct>(PRODUCTS_KEY).find((p) => p.id === id || p.sku === id),

  createProduct: (data: Partial<LocalProduct>): LocalProduct => {
    const products = getItems<LocalProduct>(PRODUCTS_KEY);
    const product: LocalProduct = {
      id: data.sku || `PRD-${String(products.length + 1).padStart(4, "0")}`,
      name: data.name || "",
      sku: data.sku || `PRD-${String(products.length + 1).padStart(4, "0")}`,
      category: data.category || "",
      brand: data.brand || "",
      warehouse: data.warehouse || "WH-001",
      cost: Number(data.cost) || 0,
      sell: Number(data.sell) || 0,
      stock: Number(data.stock) || 0,
      reorder_level: Number(data.reorder_level) || 10,
      hsn_code: data.hsn_code || "",
      unit: data.unit || "Nos",
    };
    products.push(product);
    setItems(PRODUCTS_KEY, products);
    return product;
  },

  updateProduct: (id: string, data: Partial<LocalProduct>): LocalProduct => {
    const products = getItems<LocalProduct>(PRODUCTS_KEY);
    const idx = products.findIndex((p) => p.id === id || p.sku === id);
    if (idx === -1) throw new Error("Product not found");
    products[idx] = { ...products[idx], ...data };
    setItems(PRODUCTS_KEY, products);
    return products[idx];
  },

  deleteProduct: (id: string): void => {
    const products = getItems<LocalProduct>(PRODUCTS_KEY).filter(
      (p) => p.id !== id && p.sku !== id
    );
    setItems(PRODUCTS_KEY, products);
  },

  adjustStock: (id: string, qtyChange: number): LocalProduct => {
    const products = getItems<LocalProduct>(PRODUCTS_KEY);
    const idx = products.findIndex((p) => p.id === id || p.sku === id);
    if (idx === -1) throw new Error("Product not found");
    products[idx].stock = (products[idx].stock || 0) + qtyChange;

    // Record in ledger
    const ledger = getItems<any>(STOCK_LEDGER_KEY);
    ledger.push({
      id: ledger.length + 1,
      item_code: products[idx].sku || id,
      warehouse: products[idx].warehouse || "WH-001",
      qty: qtyChange,
      voucher_type: "Manual Adjustment",
      voucher_no: `ADJ-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
    });
    setItems(STOCK_LEDGER_KEY, ledger);
    setItems(PRODUCTS_KEY, products);
    return products[idx];
  },

  // Warehouses
  getWarehouses: () => {
    ensureWarehouses();
    return getItems<any>(WAREHOUSES_KEY);
  },
  createWarehouse: (data: any) => {
    const items = getItems<any>(WAREHOUSES_KEY);
    const wh = { id: `WH-${String(items.length + 1).padStart(3, "0")}`, ...data };
    items.push(wh);
    setItems(WAREHOUSES_KEY, items);
    return wh;
  },

  // Stock Ledger
  getStockLedger: () => getItems<any>(STOCK_LEDGER_KEY),
};
