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

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: "POST", body });
  }

  put<T>(endpoint: string, body: unknown) {
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

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: AuthUser }>("/api/auth/login", { email, password }),
  logout: () => api.post("/api/auth/logout", {}),
  me: () => api.get<AuthUser>("/api/auth/me"),
};

// Module endpoints
export const dashboardApi = {
  getKpis: () => api.get<DashboardKPIs>("/api/dashboard/kpis"),
  getSalesChart: () => api.get<ChartData[]>("/api/dashboard/sales-chart"),
  getRevenueChart: () => api.get<ChartData[]>("/api/dashboard/revenue-chart"),
  getInventoryChart: () => api.get<PieData[]>("/api/dashboard/inventory-chart"),
  getRecentActivity: () => api.get<Activity[]>("/api/dashboard/recent-activity"),
};

export const crmApi = {
  getLeads: () => api.get<Lead[]>("/api/crm/leads"),
  createLead: (data: Partial<Lead>) => api.post<Lead>("/api/crm/leads", data),
  updateLead: (id: number, data: Partial<Lead>) => api.put<Lead>(`/api/crm/leads/${id}`, data),
  deleteLead: (id: number) => api.delete(`/api/crm/leads/${id}`),
  convertLead: (id: number) => api.post(`/api/crm/leads/${id}/convert`, {}),
  getCustomers: () => api.get<Customer[]>("/api/crm/customers"),
  createCustomer: (data: Partial<Customer>) => api.post<Customer>("/api/crm/customers", data),
  updateCustomer: (id: string, data: Partial<Customer>) => api.put<Customer>(`/api/crm/customers/${id}`, data),
  deleteCustomer: (id: string) => api.delete(`/api/crm/customers/${id}`),
};

export const salesApi = {
  getInvoices: () => api.get<Invoice[]>("/api/sales/invoices"),
  getInvoice: (id: string) => api.get<any>(`/api/sales/invoices/${id}`),
  createInvoice: (data: Partial<Invoice>) => api.post<Invoice>("/api/sales/invoices", data),
  updateInvoice: (id: string, data: Partial<Invoice>) => api.put<Invoice>(`/api/sales/invoices/${id}`, data),
  deleteInvoice: (id: string) => api.delete(`/api/sales/invoices/${id}`),
  getQuotations: () => api.get<Quotation[]>("/api/sales/quotations"),
  getQuotation: (id: string) => api.get<any>(`/api/sales/quotations/${id}`),
  createQuotation: (data: Partial<Quotation>) => api.post<Quotation>("/api/sales/quotations", data),
  updateQuotation: (id: string, data: Partial<Quotation>) => api.put<Quotation>(`/api/sales/quotations/${id}`, data),
  deleteQuotation: (id: string) => api.delete(`/api/sales/quotations/${id}`),
  getSummary: () => api.get<SalesSummary>("/api/sales/summary"),
};

export const inventoryApi = {
  getProducts: () => api.get<Product[]>("/api/inventory/products"),
  createProduct: (data: Partial<Product>) => api.post<Product>("/api/inventory/products", data),
  updateProduct: (sku: string, data: Partial<Product>) => api.put<Product>(`/api/inventory/products/${sku}`, data),
  deleteProduct: (sku: string) => api.delete(`/api/inventory/products/${sku}`),
  getSummary: () => api.get<InventorySummary>("/api/inventory/summary"),
  getLedger: () => api.get<StockLedgerEntry[]>("/api/inventory/ledger"),
  getStockByWarehouse: () => api.get<any[]>("/api/inventory/stock-by-warehouse"),
};

export const purchasingApi = {
  getOrders: () => api.get<PurchaseOrder[]>("/api/purchasing/orders"),
  getOrder: (id: string) => api.get<any>(`/api/purchasing/orders/${id}`),
  createOrder: (data: Partial<PurchaseOrder>) => api.post<PurchaseOrder>("/api/purchasing/orders", data),
  updateOrder: (id: string, data: Partial<PurchaseOrder>) => api.put<PurchaseOrder>(`/api/purchasing/orders/${id}`, data),
  deleteOrder: (id: string) => api.delete(`/api/purchasing/orders/${id}`),
  getReceipts: () => api.get<any[]>("/api/purchasing/receipts"),
  getReceipt: (id: string) => api.get<any>(`/api/purchasing/receipts/${id}`),
};

export const accountingApi = {
  getAccounts: () => api.get<Account[]>("/api/accounting/accounts"),
  getSummary: () => api.get<AccountingSummary>("/api/accounting/summary"),
  getLedger: () => api.get<LedgerEntry[]>("/api/accounting/ledger"),
  getPayments: () => api.get<PaymentEntry[]>("/api/accounting/payments"),
  createPayment: (data: Partial<PaymentEntry>) => api.post<PaymentEntry>("/api/accounting/payments", data),
};

export const hrApi = {
  getEmployees: () => api.get<Employee[]>("/api/hr/employees"),
  createEmployee: (data: Partial<Employee>) => api.post<Employee>("/api/hr/employees", data),
  updateEmployee: (id: string, data: Partial<Employee>) => api.put<Employee>(`/api/hr/employees/${id}`, data),
  deleteEmployee: (id: string) => api.delete(`/api/hr/employees/${id}`),
  getSummary: () => api.get<HRSummary>("/api/hr/summary"),
};

export const serviceApi = {
  getTickets: () => api.get<Ticket[]>("/api/service/tickets"),
  createTicket: (data: Partial<Ticket>) => api.post<Ticket>("/api/service/tickets", data),
  updateTicket: (id: string, data: Partial<Ticket>) => api.put<Ticket>(`/api/service/tickets/${id}`, data),
  getSummary: () => api.get<TicketSummary>("/api/service/summary"),
};

export const amcApi = {
  getContracts: () => api.get<AMCContract[]>("/api/amc/contracts"),
  createContract: (data: Partial<AMCContract>) => api.post<AMCContract>("/api/amc/contracts", data),
  getSummary: () => api.get<AMCSummary>("/api/amc/summary"),
};

export const installationApi = {
  getProjects: () => api.get<Installation[]>("/api/installations/projects"),
  createProject: (data: Partial<Installation>) => api.post<Installation>("/api/installations/projects", data),
};

export const projectsErpApi = {
  getProjects: () => api.get<Project[]>("/api/projects"),
  createProject: (data: Partial<Project>) => api.post<Project>("/api/projects", data),
};

export const supplierApi = {
  getSuppliers: () => api.get<Supplier[]>("/api/suppliers"),
  createSupplier: (data: Partial<Supplier>) => api.post<Supplier>("/api/suppliers", data),
  updateSupplier: (id: string, data: Partial<Supplier>) => api.put<Supplier>(`/api/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/api/suppliers/${id}`),
};

export const warehouseApi = {
  getWarehouses: () => api.get<Warehouse[]>("/api/warehouses"),
  createWarehouse: (data: Partial<Warehouse>) => api.post<Warehouse>("/api/warehouses", data),
  updateWarehouse: (id: string, data: Partial<Warehouse>) => api.put<Warehouse>(`/api/warehouses/${id}`, data),
  deleteWarehouse: (id: string) => api.delete(`/api/warehouses/${id}`),
};

export const reportsApi = {
  getSummary: () => api.get<ReportSummary>("/api/reports/summary"),
  view: (type: string) => api.get<any[]>(`/api/reports/view/${type}`),
  generate: (type: string, format: string) => 
    api.blobRequest(`/api/reports/generate?type=${type}&format=${format}`),
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
  total_revenue: string;
  total_expenses: string;
  net_profit: string;
  gst_payable: string;
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
