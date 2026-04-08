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
const COMPANY_SETTINGS_KEY = "suma_company_settings";
const DOC_STORE_PREFIX = "suma_doc_";
const DOC_COUNTER_PREFIX = "suma_counter_";

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

// ─── Company Settings ───
export const companySettings = {
  get: (): any => {
    try {
      return JSON.parse(localStorage.getItem(COMPANY_SETTINGS_KEY) || "{}");
    } catch {
      return {};
    }
  },
  save: (data: any) => {
    localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(data));
  },
};

// ─── Generic Document Store (for all doctypes) ───
function docKey(doctype: string) {
  return DOC_STORE_PREFIX + doctype.replace(/\s+/g, "_").toLowerCase();
}
function counterKey(doctype: string) {
  return DOC_COUNTER_PREFIX + doctype.replace(/\s+/g, "_").toLowerCase();
}

function getNextId(doctype: string, prefix: string): string {
  const key = counterKey(doctype);
  const current = parseInt(localStorage.getItem(key) || "0", 10);
  const next = current + 1;
  localStorage.setItem(key, String(next));
  const year = new Date().getFullYear();
  return `${prefix}${year}-${String(next).padStart(5, "0")}`;
}

// Naming prefixes per doctype
const NAMING_PREFIXES: Record<string, string> = {
  "Sales Invoice": "SINV-",
  "Quotation": "QTN-",
  "Sales Order": "SO-",
  "Purchase Order": "PO-",
  "Purchase Receipt": "PR-",
  "Purchase Invoice": "PINV-",
  "Customer": "CUST-",
  "Lead": "LEAD-",
  "Opportunity": "OPP-",
  "Supplier": "SUP-",
  "Employee": "EMP-",
  "Product": "PRD-",
  "AMC": "AMC-",
  "Installation": "INST-",
  "Project": "PROJ-",
  "Payment Entry": "PAY-",
  "Attendance": "ATT-",
  "Salary Slip": "SAL-",
  "Work Order": "WO-",
  "Stock Entry": "SE-",
  "Timesheet": "TS-",
  "Account": "ACC-",
  "Warehouse": "WH-",
  "BOM": "BOM-",
  "Web Page": "WP-",
};

export const docStore = {
  list: (doctype: string): any[] => {
    return getItems<any>(docKey(doctype));
  },

  get: (doctype: string, id: string): any | undefined => {
    const docs = getItems<any>(docKey(doctype));
    return docs.find((d: any) => String(d.id) === String(id) || d.name === id);
  },

  create: (doctype: string, data: any): any => {
    const docs = getItems<any>(docKey(doctype));
    const prefix = NAMING_PREFIXES[doctype] || "DOC-";
    const id = data.id || getNextId(doctype, prefix);
    const now = new Date().toISOString().split("T")[0];
    const doc = {
      ...data,
      id,
      name: data.name || id,
      workflow_state: data.workflow_state || "Draft",
      status: data.status || "Draft",
      date: data.date || now,
      created_at: now,
    };
    docs.push(doc);
    setItems(docKey(doctype), docs);
    return doc;
  },

  update: (doctype: string, id: string, data: any): any => {
    const docs = getItems<any>(docKey(doctype));
    const idx = docs.findIndex((d: any) => String(d.id) === String(id) || d.name === id);
    if (idx === -1) throw new Error(`${doctype} '${id}' not found`);
    docs[idx] = { ...docs[idx], ...data };
    setItems(docKey(doctype), docs);
    return docs[idx];
  },

  delete: (doctype: string, id: string): void => {
    const docs = getItems<any>(docKey(doctype)).filter(
      (d: any) => String(d.id) !== String(id) && d.name !== id
    );
    setItems(docKey(doctype), docs);
  },

  submit: (doctype: string, id: string): any => {
    return docStore.update(doctype, id, { workflow_state: "Submitted", status: "Submitted" });
  },

  cancel: (doctype: string, id: string): any => {
    return docStore.update(doctype, id, { workflow_state: "Cancelled", status: "Cancelled" });
  },

  amend: (doctype: string, id: string): any => {
    const original = docStore.get(doctype, id);
    if (!original) throw new Error("Document not found");
    const { id: _id, ...rest } = original;
    return docStore.create(doctype, { ...rest, workflow_state: "Draft", status: "Draft", amended_from: id });
  },
};

// ─── Local DocType Metadata (offline) ───
export const LOCAL_META: Record<string, any> = {
  "Customer": {
    doctype: "Customer",
    naming_prefix: "CUST-.YYYY.-.#####",
    fields: [
      { name: "customer_name", label: "Customer Name", fieldtype: "text", required: true },
      { name: "company", label: "Company", fieldtype: "text" },
      { name: "contact", label: "Contact Person", fieldtype: "text" },
      { name: "phone", label: "Phone", fieldtype: "text" },
      { name: "email", label: "Email", fieldtype: "text" },
      { name: "address", label: "Address", fieldtype: "text" },
      { name: "gst", label: "GSTIN", fieldtype: "text" },
      { name: "status", label: "Status", fieldtype: "select", options: "Active,Inactive" },
    ],
  },
  "Lead": {
    doctype: "Lead",
    naming_prefix: "LEAD-.YYYY.-.#####",
    fields: [
      { name: "lead_name", label: "Lead Name", fieldtype: "text", required: true },
      { name: "company", label: "Company", fieldtype: "text" },
      { name: "phone", label: "Phone", fieldtype: "text" },
      { name: "email", label: "Email", fieldtype: "text" },
      { name: "source", label: "Source", fieldtype: "select", options: "Website,Referral,Cold Call,Social Media,Exhibition,Other" },
      { name: "status", label: "Status", fieldtype: "select", options: "New,Contacted,Qualified,Converted,Lost" },
    ],
  },
  "Opportunity": {
    doctype: "Opportunity",
    naming_prefix: "OPP-.YYYY.-.#####",
    fields: [
      { name: "customer", label: "Customer/Lead", fieldtype: "text", required: true },
      { name: "opportunity_type", label: "Type", fieldtype: "select", options: "Sales,Maintenance,Project" },
      { name: "value", label: "Value (₹)", fieldtype: "number" },
      { name: "probability", label: "Probability %", fieldtype: "number" },
      { name: "expected_close", label: "Expected Close", fieldtype: "date" },
      { name: "status", label: "Status", fieldtype: "select", options: "Open,Quotation,Converted,Lost" },
    ],
  },
  "Supplier": {
    doctype: "Supplier",
    naming_prefix: "SUP-.YYYY.-.#####",
    fields: [
      { name: "supplier_name", label: "Supplier Name", fieldtype: "text", required: true },
      { name: "contact", label: "Contact Person", fieldtype: "text" },
      { name: "phone", label: "Phone", fieldtype: "text" },
      { name: "email", label: "Email", fieldtype: "text" },
      { name: "address", label: "Address", fieldtype: "text" },
      { name: "gst", label: "GSTIN", fieldtype: "text" },
      { name: "category", label: "Category", fieldtype: "select", options: "CCTV,Networking,Electrical,IT,Other" },
      { name: "status", label: "Status", fieldtype: "select", options: "Active,Inactive" },
    ],
  },
  "Sales Invoice": {
    doctype: "Sales Invoice",
    naming_prefix: "SINV-.YYYY.-.#####",
    fields: [
      { name: "customer", label: "Customer", fieldtype: "text", required: true },
      { name: "customer_name", label: "Customer Name", fieldtype: "text" },
      { name: "customer_address", label: "Customer Address", fieldtype: "text" },
      { name: "customer_gst", label: "Customer GSTIN", fieldtype: "text" },
      { name: "date", label: "Invoice Date", fieldtype: "date", required: true },
      { name: "items", label: "Items", fieldtype: "table", options: "Sales Invoice Item", columns: [
        { name: "item_code", label: "Item Code", fieldtype: "text", required: true },
        { name: "item_name", label: "Item Name", fieldtype: "text" },
        { name: "hsn_code", label: "HSN", fieldtype: "text" },
        { name: "qty", label: "Qty", fieldtype: "number", required: true },
        { name: "rate", label: "Rate", fieldtype: "number", required: true },
        { name: "amount", label: "Amount", fieldtype: "number", readonly: true },
      ]},
      { name: "amount", label: "Subtotal", fieldtype: "number", readonly: true },
      { name: "tax", label: "Tax (GST)", fieldtype: "number", readonly: true },
      { name: "grand_total", label: "Grand Total", fieldtype: "number", readonly: true },
      { name: "workflow_state", label: "Status", fieldtype: "select", options: "Draft,Submitted,Cancelled" },
    ],
  },
  "Quotation": {
    doctype: "Quotation",
    naming_prefix: "QTN-.YYYY.-.#####",
    fields: [
      { name: "customer", label: "Customer", fieldtype: "text", required: true },
      { name: "customer_name", label: "Customer Name", fieldtype: "text" },
      { name: "date", label: "Date", fieldtype: "date", required: true },
      { name: "valid_till", label: "Valid Till", fieldtype: "date" },
      { name: "items", label: "Items", fieldtype: "table", options: "Quotation Item", columns: [
        { name: "item_code", label: "Item Code", fieldtype: "text", required: true },
        { name: "item_name", label: "Item Name", fieldtype: "text" },
        { name: "qty", label: "Qty", fieldtype: "number", required: true },
        { name: "rate", label: "Rate", fieldtype: "number", required: true },
        { name: "disc_pct", label: "Disc %", fieldtype: "number" },
        { name: "amount", label: "Amount", fieldtype: "number", readonly: true },
      ]},
      { name: "amount", label: "Total", fieldtype: "number", readonly: true },
      { name: "grand_total", label: "Grand Total", fieldtype: "number", readonly: true },
      { name: "workflow_state", label: "Status", fieldtype: "select", options: "Draft,Submitted,Cancelled" },
    ],
  },
  "Sales Order": {
    doctype: "Sales Order",
    naming_prefix: "SO-.YYYY.-.#####",
    fields: [
      { name: "customer", label: "Customer", fieldtype: "text", required: true },
      { name: "date", label: "Date", fieldtype: "date", required: true },
      { name: "delivery_date", label: "Delivery Date", fieldtype: "date" },
      { name: "items", label: "Items", fieldtype: "table", options: "Sales Order Item", columns: [
        { name: "item_code", label: "Item Code", fieldtype: "text", required: true },
        { name: "item_name", label: "Item Name", fieldtype: "text" },
        { name: "qty", label: "Qty", fieldtype: "number", required: true },
        { name: "rate", label: "Rate", fieldtype: "number", required: true },
        { name: "amount", label: "Amount", fieldtype: "number", readonly: true },
      ]},
      { name: "amount", label: "Total", fieldtype: "number", readonly: true },
      { name: "grand_total", label: "Grand Total", fieldtype: "number", readonly: true },
      { name: "workflow_state", label: "Status", fieldtype: "select", options: "Draft,Submitted,Cancelled" },
    ],
  },
  "Purchase Order": {
    doctype: "Purchase Order",
    naming_prefix: "PO-.YYYY.-.#####",
    fields: [
      { name: "supplier", label: "Supplier", fieldtype: "text", required: true },
      { name: "date", label: "Date", fieldtype: "date", required: true },
      { name: "items", label: "Items", fieldtype: "table", options: "Purchase Order Item", columns: [
        { name: "item_code", label: "Item Code", fieldtype: "text", required: true },
        { name: "item_name", label: "Item Name", fieldtype: "text" },
        { name: "qty", label: "Qty", fieldtype: "number", required: true },
        { name: "rate", label: "Rate", fieldtype: "number", required: true },
        { name: "amount", label: "Amount", fieldtype: "number", readonly: true },
      ]},
      { name: "amount", label: "Total", fieldtype: "number", readonly: true },
      { name: "grand_total", label: "Grand Total", fieldtype: "number", readonly: true },
      { name: "workflow_state", label: "Status", fieldtype: "select", options: "Draft,Submitted,Cancelled" },
    ],
  },
  "Purchase Receipt": {
    doctype: "Purchase Receipt",
    naming_prefix: "PR-.YYYY.-.#####",
    fields: [
      { name: "supplier", label: "Supplier", fieldtype: "text", required: true },
      { name: "date", label: "Date", fieldtype: "date", required: true },
      { name: "items", label: "Items", fieldtype: "table", options: "Purchase Receipt Item", columns: [
        { name: "item_code", label: "Item Code", fieldtype: "text", required: true },
        { name: "item_name", label: "Item Name", fieldtype: "text" },
        { name: "qty", label: "Qty", fieldtype: "number", required: true },
        { name: "rate", label: "Rate", fieldtype: "number", required: true },
        { name: "amount", label: "Amount", fieldtype: "number", readonly: true },
      ]},
      { name: "amount", label: "Total", fieldtype: "number", readonly: true },
      { name: "workflow_state", label: "Status", fieldtype: "select", options: "Draft,Submitted,Cancelled" },
    ],
  },
  "Employee": {
    doctype: "Employee",
    naming_prefix: "EMP-.YYYY.-.#####",
    fields: [
      { name: "full_name", label: "Full Name", fieldtype: "text", required: true },
      { name: "designation", label: "Designation", fieldtype: "text" },
      { name: "department", label: "Department", fieldtype: "select", options: "Engineering,Sales,Support,HR,Finance,Admin" },
      { name: "phone", label: "Phone", fieldtype: "text" },
      { name: "email", label: "Email", fieldtype: "text" },
      { name: "date_of_joining", label: "Date of Joining", fieldtype: "date" },
      { name: "salary", label: "Monthly Salary (₹)", fieldtype: "number" },
      { name: "status", label: "Status", fieldtype: "select", options: "Active,On Leave,Resigned" },
    ],
  },
  "AMC": {
    doctype: "AMC",
    naming_prefix: "AMC-.YYYY.-.#####",
    fields: [
      { name: "customer", label: "Customer", fieldtype: "text", required: true },
      { name: "equipment", label: "Equipment", fieldtype: "text" },
      { name: "start_date", label: "Start Date", fieldtype: "date", required: true },
      { name: "end_date", label: "End Date", fieldtype: "date", required: true },
      { name: "visits", label: "Total Visits", fieldtype: "number" },
      { name: "amount", label: "Contract Value (₹)", fieldtype: "number" },
      { name: "status", label: "Status", fieldtype: "select", options: "Active,Expired,Renewed" },
    ],
  },
  "Installation": {
    doctype: "Installation",
    naming_prefix: "INST-.YYYY.-.#####",
    fields: [
      { name: "customer", label: "Customer", fieldtype: "text", required: true },
      { name: "site", label: "Site Location", fieldtype: "text" },
      { name: "devices", label: "Devices", fieldtype: "text" },
      { name: "team", label: "Team Lead", fieldtype: "text" },
      { name: "date", label: "Date", fieldtype: "date" },
      { name: "completion", label: "Completion %", fieldtype: "number" },
      { name: "status", label: "Status", fieldtype: "select", options: "Planned,In Progress,Completed" },
    ],
  },
  "Project": {
    doctype: "Project",
    naming_prefix: "PROJ-.YYYY.-.#####",
    fields: [
      { name: "project_name", label: "Project Name", fieldtype: "text", required: true },
      { name: "customer", label: "Customer", fieldtype: "text" },
      { name: "start_date", label: "Start Date", fieldtype: "date" },
      { name: "end_date", label: "End Date", fieldtype: "date" },
      { name: "budget", label: "Budget (₹)", fieldtype: "number" },
      { name: "progress", label: "Progress %", fieldtype: "number" },
      { name: "status", label: "Status", fieldtype: "select", options: "Planning,Active,On Hold,Completed" },
    ],
  },
  "Payment Entry": {
    doctype: "Payment Entry",
    naming_prefix: "PAY-.YYYY.-.#####",
    fields: [
      { name: "party_type", label: "Party Type", fieldtype: "select", options: "Customer,Supplier" },
      { name: "party", label: "Party Name", fieldtype: "text", required: true },
      { name: "payment_type", label: "Payment Type", fieldtype: "select", options: "Receive,Pay" },
      { name: "amount", label: "Amount (₹)", fieldtype: "number", required: true },
      { name: "mode", label: "Mode", fieldtype: "select", options: "Cash,Bank Transfer,UPI,Cheque,Card" },
      { name: "reference", label: "Reference/Invoice", fieldtype: "text" },
      { name: "date", label: "Date", fieldtype: "date" },
      { name: "workflow_state", label: "Status", fieldtype: "select", options: "Draft,Submitted,Cancelled" },
    ],
  },
  "Attendance": {
    doctype: "Attendance",
    naming_prefix: "ATT-.YYYY.-.#####",
    fields: [
      { name: "employee", label: "Employee", fieldtype: "text", required: true },
      { name: "date", label: "Date", fieldtype: "date", required: true },
      { name: "status", label: "Status", fieldtype: "select", options: "Present,Absent,Half Day,On Leave" },
    ],
  },
  "Salary Slip": {
    doctype: "Salary Slip",
    naming_prefix: "SAL-.YYYY.-.#####",
    fields: [
      { name: "employee", label: "Employee", fieldtype: "text", required: true },
      { name: "month", label: "Month", fieldtype: "select", options: "January,February,March,April,May,June,July,August,September,October,November,December" },
      { name: "year", label: "Year", fieldtype: "number" },
      { name: "basic_salary", label: "Basic Salary", fieldtype: "number" },
      { name: "hra", label: "HRA", fieldtype: "number" },
      { name: "da", label: "DA", fieldtype: "number" },
      { name: "pf", label: "PF Deduction", fieldtype: "number" },
      { name: "tax", label: "Tax", fieldtype: "number" },
      { name: "net_salary", label: "Net Salary", fieldtype: "number", readonly: true },
      { name: "workflow_state", label: "Status", fieldtype: "select", options: "Draft,Submitted,Cancelled" },
    ],
  },
  "Product": {
    doctype: "Product",
    naming_prefix: "PRD-.YYYY.-.#####",
    fields: [
      { name: "name", label: "Product Name", fieldtype: "text", required: true },
      { name: "sku", label: "SKU", fieldtype: "text" },
      { name: "category", label: "Category", fieldtype: "select", options: "CCTV Camera,DVR/NVR,Hard Disk,Cable,Connector,Switch,Router,UPS,Software,Accessory,Other" },
      { name: "brand", label: "Brand", fieldtype: "text" },
      { name: "cost", label: "Cost Price (₹)", fieldtype: "number" },
      { name: "sell", label: "Sell Price (₹)", fieldtype: "number" },
      { name: "stock", label: "Stock Qty", fieldtype: "number" },
      { name: "warehouse", label: "Warehouse", fieldtype: "text" },
      { name: "hsn_code", label: "HSN Code", fieldtype: "text" },
      { name: "unit", label: "Unit", fieldtype: "select", options: "Nos,Mtr,Box,Set,Kg,Ltr" },
    ],
  },
};

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

  // Stock balance by item
  getStockBalance: (itemCode: string): { qty: number; name: string } => {
    const products = getItems<LocalProduct>(PRODUCTS_KEY);
    const p = products.find((pr) => pr.sku === itemCode || pr.id === itemCode || pr.name === itemCode);
    return { qty: p?.stock || 0, name: p?.name || itemCode };
  },
};
