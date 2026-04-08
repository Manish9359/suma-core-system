import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Building2, Bell, Shield, CreditCard, Sun, Moon, Monitor, Palette, Database, RefreshCw, Trash2 as TrashIcon, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { api, systemApi } from "@/lib/api";
import { RecordModal } from "@/components/RecordModal";
import { Badge } from "@/components/ui/badge";
import { UserCog, Trash2, Edit, ShieldCheck, PlusCircle } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/LoadingState";
import { companySettings } from "@/lib/localStore";

type ThemeMode = "light" | "dark" | "system";

function ThemeCard() {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem("theme") as ThemeMode) || "light");

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem("theme", theme);
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const modes: { value: ThemeMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-5 w-5" />, desc: "Clean bright interface" },
    { value: "dark", label: "Dark", icon: <Moon className="h-5 w-5" />, desc: "Easy on the eyes" },
    { value: "system", label: "System", icon: <Monitor className="h-5 w-5" />, desc: "Match OS preference" },
  ];

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how SumaERP looks on your device.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => { setTheme(m.value); toast.success(`Theme set to ${m.label}`); }}
              className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
                theme === m.value
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <div className={`p-3 rounded-full ${theme === m.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {m.icon}
              </div>
              <span className="font-bold text-sm">{m.label}</span>
              <span className="text-[11px] text-muted-foreground">{m.desc}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DataManagementCard() {
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [seedResult, setSeedResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSeed = async () => {
    if (!confirm("This will populate ALL modules with demo data. Continue?")) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      await api.post("/api/v1/system/seed-demo-data", {});
      setSeedResult({ ok: true, msg: "Demo data seeded successfully!" });
      toast.success("Demo data seeded across all modules");
    } catch {
      // Seed locally
      const { docStore } = await import("@/lib/localStore");
      const demoData: Record<string, any[]> = {
        "Customer": [
          { customer_name: "Reliance Industries", company: "Reliance Industries Ltd", contact: "Mukesh Shah", phone: "+91 9876543210", email: "security@ril.com", address: "Navi Mumbai, Maharashtra", gst: "27AAACR5055K1ZS", status: "Active" },
          { customer_name: "Tata Consultancy", company: "TCS Ltd", contact: "Rajesh Kumar", phone: "+91 9876543211", email: "facilities@tcs.com", address: "Hinjewadi, Pune", gst: "27AAACT2727Q1ZV", status: "Active" },
          { customer_name: "Infosys Campus", company: "Infosys Ltd", contact: "Priya Sharma", phone: "+91 9876543212", email: "admin@infosys.com", address: "Electronics City, Bangalore", gst: "29AABCI1234F1ZP", status: "Active" },
          { customer_name: "HDFC Bank Branch", company: "HDFC Bank", contact: "Amit Patel", phone: "+91 9876543213", email: "branch@hdfc.com", address: "FC Road, Pune", gst: "27AAACH1234Q1ZS", status: "Active" },
          { customer_name: "Maharashtra Police HQ", company: "Govt of Maharashtra", contact: "Inspector Deshmukh", phone: "+91 9876543214", email: "it@maharashtra.gov.in", address: "Mumbai, Maharashtra", gst: "27AAAGM1234A1ZP", status: "Active" },
        ],
        "Supplier": [
          { supplier_name: "Hikvision India", contact: "Wang Li", phone: "+91 22-12345678", email: "sales@hikvision.in", address: "Mumbai", gst: "27AABCH1234K1ZS", category: "CCTV" },
          { supplier_name: "Dahua Technology", contact: "Chen Wei", phone: "+91 22-87654321", email: "india@dahuatech.com", address: "Delhi", gst: "07AABCD1234K1ZS", category: "CCTV" },
          { supplier_name: "D-Link India", contact: "Suresh Nair", phone: "+91 80-12345678", email: "enterprise@dlink.co.in", address: "Bangalore", gst: "29AABCD5678K1ZP", category: "Networking" },
        ],
        "Lead": [
          { lead_name: "Wipro New Campus", company: "Wipro Ltd", phone: "+91 9812345678", email: "facilities@wipro.com", source: "Referral", status: "New" },
          { lead_name: "SBI Main Branch", company: "State Bank of India", phone: "+91 9823456789", email: "it@sbi.co.in", source: "Cold Call", status: "Contacted" },
          { lead_name: "Bajaj Auto Plant", company: "Bajaj Auto", phone: "+91 9834567890", email: "security@bajaj.com", source: "Exhibition", status: "Qualified" },
        ],
        "Employee": [
          { full_name: "Rajesh Kulkarni", designation: "Senior Engineer", department: "Engineering", phone: "+91 9876000001", email: "rajesh@sumatech.in", salary: 65000, status: "Active" },
          { full_name: "Priya Joshi", designation: "Sales Manager", department: "Sales", phone: "+91 9876000002", email: "priya@sumatech.in", salary: 55000, status: "Active" },
          { full_name: "Amit Deshmukh", designation: "Technician", department: "Support", phone: "+91 9876000003", email: "amit@sumatech.in", salary: 35000, status: "Active" },
          { full_name: "Sneha Patil", designation: "HR Executive", department: "HR", phone: "+91 9876000004", email: "sneha@sumatech.in", salary: 45000, status: "Active" },
        ],
        "Product": [
          { name: "Hikvision 2MP Dome Camera", sku: "HIK-DS-2CE5AD0T", category: "CCTV Camera", brand: "Hikvision", cost: 1200, sell: 1850, stock: 45, warehouse: "WH-001", hsn_code: "85258090", unit: "Nos" },
          { name: "Hikvision 4MP IP Bullet", sku: "HIK-DS-2CD1043G0", category: "CCTV Camera", brand: "Hikvision", cost: 3200, sell: 4500, stock: 20, warehouse: "WH-001", hsn_code: "85258090", unit: "Nos" },
          { name: "Dahua 8CH NVR", sku: "DH-NVR4108HS", category: "DVR/NVR", brand: "Dahua", cost: 5500, sell: 7800, stock: 12, warehouse: "WH-001", hsn_code: "85219090", unit: "Nos" },
          { name: "Seagate 2TB HDD", sku: "ST2000VX015", category: "Hard Disk", brand: "Seagate", cost: 4200, sell: 5500, stock: 30, warehouse: "WH-001", hsn_code: "84717020", unit: "Nos" },
          { name: "Cat6 Cable 305m Box", sku: "CAT6-305M-BOX", category: "Cable", brand: "D-Link", cost: 3800, sell: 5200, stock: 8, warehouse: "WH-001", hsn_code: "85444999", unit: "Box" },
          { name: "D-Link 24-Port Switch", sku: "DGS-1024D", category: "Switch", brand: "D-Link", cost: 4800, sell: 6500, stock: 5, warehouse: "WH-001", hsn_code: "85176290", unit: "Nos" },
          { name: "BNC Connector Pack (100)", sku: "BNC-100PK", category: "Connector", brand: "Generic", cost: 250, sell: 450, stock: 100, warehouse: "WH-001", hsn_code: "85366990", unit: "Box" },
          { name: "APC 1KVA UPS", sku: "APC-BX1100", category: "UPS", brand: "APC", cost: 4500, sell: 6200, stock: 3, warehouse: "WH-001", hsn_code: "85044090", unit: "Nos" },
        ],
        "AMC": [
          { customer: "Reliance Industries", equipment: "64 CCTV Cameras + 4 NVR", start_date: "2025-04-01", end_date: "2026-03-31", visits: 4, amount: 85000, status: "Active" },
          { customer: "HDFC Bank Branch", equipment: "16 Cameras + DVR", start_date: "2025-01-01", end_date: "2025-12-31", visits: 2, amount: 25000, status: "Active" },
        ],
        "Installation": [
          { customer: "TCS Hinjewadi", site: "Building 3, Hinjewadi Phase 2", devices: "32 IP Cameras + NVR", team: "Rajesh Kulkarni", completion: 75, status: "In Progress" },
          { customer: "SBI Main Branch", site: "FC Road, Pune", devices: "8 Dome Cameras + DVR", team: "Amit Deshmukh", completion: 100, status: "Completed" },
        ],
        "Project": [
          { project_name: "TCS Campus Surveillance Upgrade", customer: "Tata Consultancy", start_date: "2025-03-01", end_date: "2025-06-30", budget: 450000, progress: 60, status: "Active" },
          { project_name: "HDFC Branch Security System", customer: "HDFC Bank Branch", start_date: "2025-04-01", end_date: "2025-05-15", budget: 120000, progress: 30, status: "Active" },
        ],
      };

      for (const [dt, records] of Object.entries(demoData)) {
        for (const rec of records) {
          docStore.create(dt, rec);
        }
      }

      // Also save products to inventory store
      const { localStore } = await import("@/lib/localStore");
      const existingProducts = localStore.getProducts();
      if (existingProducts.length === 0) {
        for (const p of demoData["Product"]) {
          localStore.createProduct(p as any);
        }
      }

      setSeedResult({ ok: true, msg: "Demo data seeded locally! Refresh pages to see data." });
      toast.success("Demo data seeded locally across all modules");
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("⚠️ WARNING: This will DELETE all data. This cannot be undone! Continue?")) return;
    setClearing(true);
    setSeedResult(null);
    try {
      await api.post("/api/v1/system/clear-demo-data", {});
    } catch {
      // Clear localStorage docs
      const keys = Object.keys(localStorage).filter(k => k.startsWith("suma_doc_") || k.startsWith("suma_counter_"));
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem("suma_products");
      localStorage.removeItem("suma_stock_ledger");
    }
    setSeedResult({ ok: true, msg: "All data cleared." });
    toast.success("Data cleared successfully");
    setClearing(false);
  };

  const modules = [
    "Customers (5)", "Suppliers (3)", "Products (8)", "Employees (4)",
    "Leads (3)", "AMC Contracts (2)", "Installations (2)", "Projects (2)"
  ];

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Data Management
        </CardTitle>
        <CardDescription>Seed demo data across all modules or clear existing data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Seed Demo Data</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Populate all modules with realistic Indian business data for testing.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {modules.map((m) => (
              <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
            ))}
          </div>
          <Button onClick={handleSeed} disabled={seeding || clearing} className="gap-2 w-full sm:w-auto">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {seeding ? "Seeding data..." : "Seed Demo Data"}
          </Button>
        </div>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-destructive">Clear All Data</h3>
              <p className="text-xs text-muted-foreground mt-1">Permanently delete all transactional data.</p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleClear} disabled={seeding || clearing} className="gap-2 w-full sm:w-auto">
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4" />}
            {clearing ? "Clearing data..." : "Clear All Data"}
          </Button>
        </div>

        {seedResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            seedResult.ok ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
          }`}>
            {seedResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {seedResult.msg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  // Users & Roles
  const [usersData, setUsersData] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(false);
  const [rolesData, setRolesData] = useState<any[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(false);

  useEffect(() => {
    // Load company settings
    api.get<any>("/api/v1/settings/company")
      .then(setCompany)
      .catch(() => setCompany(companySettings.get()))
      .finally(() => setCompanyLoading(false));

    // Load users
    if (user?.role === "Admin") {
      setUsersLoading(true);
      systemApi.getUsers()
        .then(setUsersData)
        .catch(() => setUsersError(true))
        .finally(() => setUsersLoading(false));

      setRolesLoading(true);
      systemApi.getRoles()
        .then(setRolesData)
        .catch(() => setRolesError(true))
        .finally(() => setRolesLoading(false));
    }
  }, [user?.role]);

  const refetchUsers = () => {
    systemApi.getUsers().then(setUsersData).catch(() => {});
  };

  const merged = { ...(company || {}), ...form };
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/settings/company", merged);
      toast.success("Settings saved");
    } catch {
      companySettings.save(merged);
      toast.success("Settings saved locally");
    }
    setCompany(merged);
    setForm({});
  };

  if (companyLoading) {
    return <div className="module-page flex items-center justify-center h-[50vh]"><LoadingState message="Initializing settings..." /></div>;
  }

  return (
    <div className="module-page max-w-4xl mx-auto">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your ERP configuration and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className={`grid ${user?.role === "Admin" ? 'grid-cols-7' : 'grid-cols-4'} bg-muted/50 border shadow-sm`}>
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          {user?.role === "Admin" && <TabsTrigger value="users" className="gap-2"><UserCog className="h-4 w-4" /> Users</TabsTrigger>}
          <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" /> Theme</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Alerts</TabsTrigger>
          <TabsTrigger value="bank" className="gap-2"><CreditCard className="h-4 w-4" /> Bank & UPI</TabsTrigger>
          {user?.role === "Admin" && <TabsTrigger value="data" className="gap-2"><Database className="h-4 w-4" /> Data</TabsTrigger>}
          {user?.role === "Admin" && <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>}
        </TabsList>

        <form onSubmit={handleSave}>
          <TabsContent value="company" className="focus-visible:outline-none">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
                <CardDescription>Used on Invoices, Quotations and official documents.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={merged.company_name || ""} onChange={e => set("company_name", e.target.value)} placeholder="Suma Surveillance Tech Pvt. Ltd." />
                  </div>
                  <div className="space-y-2">
                    <Label>GSTIN</Label>
                    <Input value={merged.gstin || ""} onChange={e => set("gstin", e.target.value)} placeholder="27XXXXXXXXXX1Z5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={merged.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="+91 020-68197600" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={merged.email || ""} onChange={e => set("email", e.target.value)} placeholder="billing@company.com" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Billing Address</Label>
                    <Textarea value={merged.address || ""} onChange={e => set("address", e.target.value)} placeholder="Full address..." rows={2} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Terms & Conditions (shown on invoices)</Label>
                    <Textarea value={merged.terms || ""} onChange={e => set("terms", e.target.value)} rows={4} />
                  </div>
                </div>
                <div className="pt-4 border-t flex justify-end">
                  <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank" className="focus-visible:outline-none">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Bank & UPI Details</CardTitle>
                <CardDescription>Displayed on invoice footers for payment. UPI ID is used for QR code generation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input value={merged.bank_name || ""} onChange={e => set("bank_name", e.target.value)} placeholder="HDFC Bank Ltd." />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input value={merged.bank_account || ""} onChange={e => set("bank_account", e.target.value)} placeholder="502000XXXXXX12" />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input value={merged.bank_ifsc || ""} onChange={e => set("bank_ifsc", e.target.value)} placeholder="HDFC0001234" />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Input value={merged.bank_branch || ""} onChange={e => set("bank_branch", e.target.value)} placeholder="Kothrud, Pune" />
                  </div>
                  <div className="space-y-2 md:col-span-2 bg-primary/5 rounded-xl p-4 border border-primary/20">
                    <Label className="text-primary font-bold text-sm">UPI ID (for Invoice QR Code)</Label>
                    <Input value={merged.upi_id || ""} onChange={e => set("upi_id", e.target.value)} placeholder="yourcompany@hdfcbank" className="text-base font-mono" />
                    <p className="text-xs text-muted-foreground">This UPI ID will be embedded in the QR code on invoices. Customers can scan it with Google Pay, PhonePe, Paytm, etc.</p>
                  </div>
                </div>
                <div className="pt-4 border-t flex justify-end">
                  <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> Save Bank & UPI Details</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </form>

        <TabsContent value="appearance">
          <ThemeCard />
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>System Alerts & Notifications</CardTitle>
              <CardDescription>View recent system-wide alerts and messages.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">No new system alerts at this time.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage system access and permissions (Admin Only)</CardDescription>
              </div>
              <Button onClick={() => { setEditingUser({}); setUserModalOpen(true); }} disabled={user?.role !== "Admin"} className="gap-2">
                <PlusCircle className="h-4 w-4" /> Add User
              </Button>
            </CardHeader>
            <CardContent>
              {usersLoading ? <LoadingState message="Loading users..." /> : usersError ? (
                <ErrorState message="Failed to load users. Backend not available." onRetry={refetchUsers} />
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b text-[10px] font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="text-left px-4 py-3">Username</th>
                        <th className="text-left px-4 py-3">Role</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(usersData) ? usersData : []).map((u: any) => (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{u.username}</td>
                          <td className="px-4 py-3"><Badge variant="outline">{u.role}</Badge></td>
                          <td className="px-4 py-3"><span className={u.status === "Active" ? "status-badge status-active" : "status-badge status-closed"}>{u.status}</span></td>
                          <td className="px-4 py-3 text-right flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditingUser(u); setUserModalOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={async () => {
                              if (confirm(`Delete user ${u.username}?`)) {
                                try { await systemApi.deleteUser(u.id); toast.success("User deleted"); refetchUsers(); } catch (e: any) { toast.error(e.message); }
                              }
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>Configure Role-Based Access Control (RBAC)</CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? <LoadingState message="Loading roles..." /> : rolesError ? (
                <ErrorState message="Failed to load roles. Backend not available." />
              ) : (
                <div className="space-y-4">
                  {(Array.isArray(rolesData) ? rolesData : []).map((role: any) => (
                    <div key={role.id} className="border rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{role.name}</h3>
                        <Button variant="ghost" size="sm" className="text-primary gap-1.5">
                          <ShieldCheck className="h-4 w-4" /> Edit Permissions
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Custom Role ID: {role.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="focus-visible:outline-none">
          <DataManagementCard />
        </TabsContent>
      </Tabs>

      <RecordModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        title={editingUser?.id ? "Edit User" : "Add User"}
        fields={[
          { name: "username", label: "Email / Username", type: "text", required: true },
          { name: "password", label: "Password", type: "text", required: !editingUser?.id },
          { name: "role", label: "Primary Role", type: "select", options: ["Admin", "Manager", "Employee"] },
          { name: "status", label: "Account Status", type: "select", options: ["Active", "Disabled"] },
        ]}
        initialData={editingUser}
        onSubmit={async (data) => {
          if (editingUser?.id) {
            await systemApi.updateUser(editingUser.id, data);
          } else {
            await systemApi.createUser(data);
          }
          refetchUsers();
        }}
      />
    </div>
  );
}
