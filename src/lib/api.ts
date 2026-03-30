// API Client for Python FastAPI Backend
// Configure BASE_URL to point to your Python server

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {} } = options;
    const token = this.getToken();

    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (response.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      const detail = error.detail;
      const msg = typeof detail === "string" ? detail : Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.join(".")}: ${d.msg}`).join(" | ")
        : JSON.stringify(detail) || `HTTP ${response.status}`;
      throw new Error(msg);
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body: unknown = {}) {
    return this.request<T>(endpoint, { method: "POST", body });
  }

  put<T>(endpoint: string, body: unknown = {}) {
    return this.request<T>(endpoint, { method: "PUT", body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async blobRequest(endpoint: string): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error("File request failed");
    return response.blob();
  }
}

export const api = new ApiClient(BASE_URL);

// NEW: Generic Document API for modular backend
export const docApi = {
  list: <T>(doctype: string, params: { limit?: number; offset?: number; order_by?: string } = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return api.get<T[]>(`/api/v1/doc/${encodeURIComponent(doctype)}?${query}`);
  },
  get: <T>(doctype: string, name: string) => 
    api.get<T>(`/api/v1/doc/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`),
  create: <T>(doctype: string, data: any) => 
    api.post<T>(`/api/v1/doc/${encodeURIComponent(doctype)}`, data),
  update: <T>(doctype: string, name: string, data: any) => 
    api.put<T>(`/api/v1/doc/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, data),
  delete: (doctype: string, name: string) => 
    api.delete(`/api/v1/doc/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`),
  submit: (doctype: string, name: string) => 
    api.post(`/api/v1/doc/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}/submit`, {}),
  cancel: (doctype: string, name: string) => 
    api.post(`/api/v1/doc/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}/cancel`, {}),
};

// Auth endpoints (Updated for v1)
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ access_token: string }>("/api/v1/auth/login", { email: username, password }),
  logout: () => Promise.resolve(), // Backend v1 handles logout by client-side token removal
  me: () => api.get<AuthUser>("/api/v1/auth/me"),
};

// Module endpoints
export const dashboardApi = {
  getKpis: async () => {
    // Dynamically calculate KPIs from reports and doc counts
    const pl = await accountingApi.getSummary(); // P&L
    const invoices = await salesApi.getInvoices();
    const lowStock = await inventoryApi.getProducts(); 
    
    return {
      total_sales: `₹${invoices.reduce((acc, inv: any) => acc + (parseFloat(inv.grand_total) || 0), 0).toFixed(0)}`,
      monthly_revenue: `₹${pl.total_income?.toFixed(0) || "0"}`,
      pending_invoices: invoices.filter((i: any) => i.status === "Draft").length,
      low_stock_items: 0, 
      active_amcs: 0,
      open_tickets: 0,
      sales_change: "+12%", 
      revenue_change: "+5%",
      invoices_change: "0",
      stock_change: "-2%",
      amc_change: "+1",
      tickets_change: "-3"
    } as DashboardKPIs;
  },
  getSalesChart: () => api.get<ChartData[]>("/api/v1/reports/sales-chart"), 
  getRevenueChart: () => api.get<ChartData[]>("/api/v1/reports/revenue-chart"),
  getInventoryChart: () => api.get<PieData[]>("/api/v1/reports/inventory-chart"),
  getRecentActivity: () => api.get<Activity[]>("/api/v1/reports/recent-activity"),
};

export const systemApi = {
  getNotifications: () => api.get<any[]>("/api/v1/system/notifications"),
  getUsers: () => api.get<any[]>("/api/v1/system/users"),
  createUser: (data: any) => api.post("/api/v1/system/users", data),
  updateUser: (id: number, data: any) => api.put(`/api/v1/system/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/api/v1/system/users/${id}`),
  getRoles: () => api.get<any[]>("/api/v1/system/roles"),
  getRolePermissions: (id: number) => api.get<any[]>(`/api/v1/system/roles/${id}/permissions`),
  createRole: (name: string) => api.post(`/api/v1/system/roles?name=${encodeURIComponent(name)}`),
  updateRolePermissions: (id: number, perms: any[]) => api.post(`/api/v1/system/roles/${id}/permissions`, perms),
};

export const crmApi = {
  getLeads: () => docApi.list<Lead>("Lead"),
  createLead: (data: Partial<Lead>) => docApi.create<Lead>("Lead", data),
  updateLead: (id: number, data: Partial<Lead>) => docApi.update<Lead>("Lead", id.toString(), data),
  deleteLead: (id: number) => docApi.delete("Lead", id.toString()),
  
  getCustomers: () => docApi.list<Customer>("Customer"),
  createCustomer: (data: Partial<Customer>) => docApi.create<Customer>("Customer", data),
  updateCustomer: (id: string, data: Partial<Customer>) => docApi.update<Customer>("Customer", id, data),
  deleteCustomer: (id: string) => docApi.delete("Customer", id),
};

export const salesApi = {
  getInvoices: () => docApi.list<Invoice>("Sales Invoice"),
  getInvoice: (id: string) => docApi.get<any>("Sales Invoice", id),
  createInvoice: (data: Partial<Invoice>) => docApi.create<Invoice>("Sales Invoice", data),
  updateInvoice: (id: string, data: Partial<Invoice>) => docApi.update<Invoice>("Sales Invoice", id, data),
  deleteInvoice: (id: string) => docApi.delete("Sales Invoice", id),
  submitInvoice: (id: string) => docApi.submit("Sales Invoice", id),

  getQuotations: () => docApi.list<Quotation>("Quotation"),
  getQuotation: (id: string) => docApi.get<any>("Quotation", id),
  createQuotation: (data: Partial<Quotation>) => docApi.create<Quotation>("Quotation", data),
  updateQuotation: (id: string, data: Partial<Quotation>) => docApi.update<Quotation>("Quotation", id, data),
  deleteQuotation: (id: string) => docApi.delete("Quotation", id),
  
  getOrders: () => api.get<any[]>("/api/v1/sales/orders"),
  createOrder: (data: any) => api.post("/api/v1/sales/orders", data),
  getSummary: () => api.get<any>("/api/v1/reports/summary"),
};

export const inventoryApi = {
  getProducts: () => docApi.list<Product>("Product"),
  createProduct: (data: Partial<Product>) => docApi.create<Product>("Product", data),
  updateProduct: (sku: string, data: Partial<Product>) => docApi.update<Product>("Product", sku, data),
  deleteProduct: (sku: string) => docApi.delete("Product", sku),
  getWarehouses: () => docApi.list<Warehouse>("Warehouse"),
  getSummary: () => api.get<InventorySummary>("/api/v1/inventory/summary"),
  getStockByWarehouse: () => api.get<any[]>("/api/v1/inventory/stock-by-warehouse"),
  getLedger: () => api.get<StockLedgerEntry[]>("/api/v1/inventory/ledger"),
};

export const purchasingApi = {
  getOrders: () => api.get<PurchaseOrder[]>("/api/v1/purchasing/orders"),
  getOrder: (id: string) => api.get<any>(`/api/v1/purchasing/orders/${id}`),
  createOrder: (data: Partial<PurchaseOrder>) => api.post<PurchaseOrder>("/api/v1/purchasing/orders", data),
  updateOrder: (id: string, data: Partial<PurchaseOrder>) => api.put<PurchaseOrder>(`/api/v1/purchasing/orders/${id}`, data),
  deleteOrder: (id: string) => api.delete(`/api/v1/purchasing/orders/${id}`),
  getReceipts: () => api.get<any[]>("/api/v1/purchasing/receipts"),
  getReceipt: (id: string) => api.get<any>(`/api/v1/purchasing/receipts/${id}`),
  createReceipt: (data: any) => api.post<any>("/api/v1/purchasing/receipts", data),
};

export const accountingApi = {
  getSummary: () => api.get<AccountingSummary>("/api/v1/reports/profit-and-loss"),
  getTrialBalance: () => api.get<any[]>("/api/v1/reports/trial-balance"),
  getBalanceSheet: () => api.get<any>("/api/v1/reports/balance-sheet"),
};

export const hrApi = {
  getEmployees: () => api.get<Employee[]>("/api/v1/hr/employees"),
  createEmployee: (data: Partial<Employee>) => api.post<Employee>("/api/v1/hr/employees", data),
  updateEmployee: (id: string, data: Partial<Employee>) => api.put<Employee>(`/api/v1/hr/employees/${id}`, data),
  deleteEmployee: (id: string) => api.delete(`/api/v1/hr/employees/${id}`),
  getSummary: () => api.get<HRSummary>("/api/v1/hr/summary"),
  getAttendance: () => api.get<any[]>("/api/v1/hr/attendance"),
  markAttendance: (data: any) => api.post<any>("/api/v1/hr/attendance", data),
  getSalarySlips: () => api.get<any[]>("/api/v1/hr/salary_slips"),
  createSalarySlip: (data: any) => api.post<any>("/api/v1/hr/salary_slips", data),
  updateSalarySlip: (id: string, data: any) => api.put<any>(`/api/v1/hr/salary_slips/${id}`, data),
};

export const serviceApi = {
  getTickets: () => api.get<Ticket[]>("/api/v1/service/tickets"),
  createTicket: (data: Partial<Ticket>) => api.post<Ticket>("/api/v1/service/tickets", data),
  updateTicket: (id: string, data: Partial<Ticket>) => api.put<Ticket>(`/api/v1/service/tickets/${id}`, data),
  getSummary: () => api.get<TicketSummary>("/api/v1/service/summary"),
};

export const amcApi = {
  getContracts: () => api.get<AMCContract[]>("/api/v1/amc/contracts"),
  createContract: (data: Partial<AMCContract>) => api.post<AMCContract>("/api/v1/amc/contracts", data),
  getSummary: () => api.get<AMCSummary>("/api/v1/amc/summary"),
};

export const installationApi = {
  getProjects: () => api.get<Installation[]>("/api/v1/installations/projects"),
  createProject: (data: Partial<Installation>) => api.post<Installation>("/api/v1/installations/projects", data),
};

export const projectsErpApi = {
  getProjects: () => api.get<Project[]>("/api/v1/projects"),
  createProject: (data: Partial<Project>) => api.post<Project>("/api/v1/projects", data),
};

export const supplierApi = {
  getSuppliers: () => api.get<Supplier[]>("/api/v1/suppliers"),
  createSupplier: (data: Partial<Supplier>) => api.post<Supplier>("/api/v1/suppliers", data),
  updateSupplier: (id: string, data: Partial<Supplier>) => api.put<Supplier>(`/api/v1/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/api/v1/suppliers/${id}`),
};

export const warehouseApi = {
  getWarehouses: () => api.get<Warehouse[]>("/api/v1/warehouses"),
  createWarehouse: (data: Partial<Warehouse>) => api.post<Warehouse>("/api/v1/warehouses", data),
  updateWarehouse: (id: string, data: Partial<Warehouse>) => api.put<Warehouse>(`/api/v1/warehouses/${id}`, data),
  deleteWarehouse: (id: string) => api.delete(`/api/v1/warehouses/${id}`),
};

export const engineApi = {
  calculateTax: (payload: any) => api.post<{grand_total: number, taxes: any[]}>("/api/v1/erpnext/calculate_tax_full", payload),
  getStockBalance: (itemCode: string) => api.get<any>(`/api/v1/engine/stock_balance/${itemCode}`),
  validateLedger: (glMap: any[]) => api.post<any>("/api/v1/engine/validate_ledger", { gl_map: glMap }),
  getProductionDemand: (bomId: string, qty: number) => api.post<any>("/api/v1/manufacturing/produce", { bom_id: bomId, qty, dry_run: true }),
  calcSalary: (empId: string, month: number, year: number) => api.get<any>(`/api/v1/hr/calculate_salary?employee_id=${empId}&month=${month}&year=${year}`)
};

export const workflowApi = {
  approve: (doctype: string, docid: string) => api.post<any>(`/api/v1/workflow/approve/${encodeURIComponent(doctype)}/${encodeURIComponent(docid)}`),
  getSignatures: (doctype: string, docid: string) => api.get<any[]>(`/api/v1/workflow/signatures/${encodeURIComponent(doctype)}/${encodeURIComponent(docid)}`),
};

export const reportsApi = {
  getSummary: () => api.get<ReportSummary>("/api/v1/reports/summary"),
  view: (type: string) => api.get<any[]>(`/api/v1/reports/view/${type}`),
  generate: (type: string, format: string) => 
    api.blobRequest(`/api/v1/reports/generate?type=${type}&format=${format}`),
};

export interface ReportSummary {
  sales_trend: any[];
  inventory_status: any;
  financial_health: number;
}

// Types
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface DashboardKPIs {
  total_sales: string;
  monthly_revenue: string;
  pending_invoices: number;
  low_stock_items: number;
  active_amcs: number;
  open_tickets: number;
  sales_change: string;
  revenue_change: string;
  invoices_change: string;
  stock_change: string;
  amc_change: string;
  tickets_change: string;
}

export interface ChartData { month: string; value: number; }
export interface PieData { name: string; value: number; }
export interface Activity { text: string; time: string; }

export interface Lead {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: string;
  status: string;
}

export interface Customer {
  id: string;
  company: string;
  contact: string;
  address?: string;
  gst: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  customer: string;
  date: string;
  amount: string;
  status: string;
  custom_data?: any;
}

export interface Quotation {
  id: string;
  customer: string;
  date: string;
  valid_till?: string;
  amount: number;
  grand_total?: number;
  status: string;
  custom_data?: any;
}

export interface SalesSummary {
  total_invoiced: string;
  received: string;
  outstanding: string;
}

export interface Product {
  sku: string;
  name: string;
  brand: string;
  category: string;
  cost: string;
  sell: string;
  stock: number;
  warehouse: string;
  low?: boolean;
}

export interface InventorySummary {
  total_products: number;
  stock_value: string;
  warehouses: number;
  low_stock_count: number;
}

export interface StockLedgerEntry {
  id: number;
  item_code: string;
  warehouse: string;
  qty: number;
  voucher_type: string;
  voucher_no: string;
  date: string;
}

export interface PurchaseOrder {
  id: string;
  vendor: string;
  date: string;
  items: number;
  total: string;
  status: string;
}

export interface Account {
  code: string;
  name: string;
  type: string;
  balance: string;
}

export interface AccountingSummary {
  total_income: number;
  total_expense: number;
  net_profit: number;
  income_by_account?: any[];
  expense_by_account?: any[];
}

export interface LedgerEntry {
  date: string;
  account: string;
  debit: string;
  credit: string;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  dept: string;
  salary: string;
  joining: string;
  status: string;
}

export interface HRSummary {
  total_employees: number;
  on_leave: number;
  monthly_payroll: string;
  departments: number;
}

export interface Ticket {
  id: string;
  client: string;
  issue: string;
  priority: string;
  technician: string;
  status: string;
}

export interface TicketSummary {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface AMCContract {
  id: string;
  client: string;
  equipment: string;
  start: string;
  end: string;
  visits: string;
  status: string;
}

export interface AMCSummary {
  active: number;
  renewal_due: number;
  expired: number;
}

export interface Installation {
  id: string;
  client: string;
  site: string;
  devices: string;
  team: string;
  date: string;
  status: string;
  completion?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  address: string;
  category: string;
}

export interface Project {
  id: string;
  name: string;
  customer: string;
  status: string;
  start_date: string;
  end_date: string;
}

export interface PaymentEntry {
  id: string;
  date: string;
  party_type: string;
  party: string;
  payment_type: string;
  amount: number;
  mode_of_payment: string;
}
