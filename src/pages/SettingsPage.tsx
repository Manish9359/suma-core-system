import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Building2, Bell, Shield, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { api, authApi } from "@/lib/api";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { Badge } from "@/components/ui/badge";
import { UserCog, Trash2, Edit, ShieldCheck, PlusCircle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: company, refetch } = useApiQuery(["settings", "company"], () => api.get<any>("/api/settings/company"));
  const { data: usersData, refetch: refetchUsers } = useApiQuery(["system", "users"], () => api.get<any[]>("/api/system/users"));
  const { data: rolesData, refetch: refetchRoles } = useApiQuery(["system", "roles"], () => api.get<any[]>("/api/system/roles"));
  const [form, setForm] = useState<any>({});
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const merged = { ...company, ...form };

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put("/api/settings/company", merged);
      toast.success("Company settings saved successfully!");
      refetch();
      setForm({});
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
  };

  return (
    <div className="module-page max-w-4xl mx-auto">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your ERP configuration and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid grid-cols-4 bg-muted/50 border shadow-sm">
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><UserCog className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Alerts</TabsTrigger>
          <TabsTrigger value="bank" className="gap-2"><CreditCard className="h-4 w-4" /> Bank</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>
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
                <CardTitle>Bank Details</CardTitle>
                <CardDescription>Displayed on invoice footers for payment reference.</CardDescription>
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
                </div>
                <div className="pt-4 border-t flex justify-end">
                  <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> Save Bank Details</Button>
                </div>
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
                <Button 
                  onClick={() => {
                    setEditingUser({});
                    setUserModalOpen(true);
                  }}
                  className="gap-2"
                >
                  <PlusCircle className="h-4 w-4" /> Add User
                </Button>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b text-[10px] font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="text-left px-4 py-3">Username</th>
                        <th className="text-left px-4 py-3">Role</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(usersData as any[])?.map((u: any) => (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium">{u.username}</td>
                          <td className="px-4 py-3"><Badge variant="outline">{u.role}</Badge></td>
                          <td className="px-4 py-3">
                            <span className={u.status === "Active" ? "status-badge status-active" : "status-badge status-closed"}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-500 hover:text-primary"
                              onClick={() => {
                                setEditingUser(u);
                                setUserModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-500 hover:text-destructive"
                              onClick={async () => {
                                if (confirm(`Delete user ${u.username}?`)) {
                                  try {
                                    await api.delete(`/api/system/users/${u.id}`);
                                    toast.success("User deleted");
                                    refetchUsers();
                                  } catch (e: any) { toast.error(e.message); }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Role Management</CardTitle>
                  <CardDescription>Configure Role-Based Access Control (RBAC)</CardDescription>
                </div>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    const name = prompt("Enter new Role name:");
                    if (name) {
                      try {
                        await api.post(`/api/system/roles?name=${name}`);
                        toast.success("Role created");
                        refetchRoles();
                      } catch (e: any) { toast.error(e.message); }
                    }
                  }}
                  className="gap-2"
                >
                  <PlusCircle className="h-4 w-4" /> Add Role
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(rolesData as any[])?.map((role: any) => (
                    <div key={role.id} className="border rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{role.name}</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary gap-1.5"
                          onClick={() => {
                            setSelectedRole(role);
                            setPermModalOpen(true);
                          }}
                        >
                          <ShieldCheck className="h-4 w-4" /> Edit Permissions
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Custom Role ID: {role.id}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </form>
      </Tabs>
      <RecordModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        title={editingUser?.id ? "Edit User" : "Add User"}
        fields={[
          { name: "username", label: "Email / Username", type: "text", required: true },
          { name: "password", label: "Password", type: "text", required: !editingUser?.id },
          { name: "role", label: "Primary Role", type: "select", options: ["Admin", "Manager", "Employee", ...(rolesData as any[])?.map(r => r.name) || []] },
          { name: "status", label: "Account Status", type: "select", options: ["Active", "Disabled"] }
        ]}
        initialData={editingUser}
        onSubmit={async (data) => {
          if (editingUser?.id) {
            await api.put(`/api/system/users/${editingUser.id}`, data);
          } else {
            await api.post("/api/system/users", data);
          }
          refetchUsers();
        }}
      />

      <RecordModal
        open={permModalOpen}
        onOpenChange={setPermModalOpen}
        title={`Edit Permissions: ${selectedRole?.name}`}
        description="Configure module-level access for this role."
        fields={[
          { 
            name: "permissions", 
            label: "Module Permissions", 
            type: "table",
            columns: [
              { name: "doctype", label: "Module / DocType", type: "select", options: ["Sales Invoice", "Purchase Order", "Stock Entry", "CRM Lead", "Employee", "Product", "Account"] },
              { name: "can_read", label: "Read", type: "select", options: [{label: "Yes", value: "true"}, {label: "No", value: "false"}] },
              { name: "can_write", label: "Write", type: "select", options: [{label: "Yes", value: "true"}, {label: "No", value: "false"}] },
              { name: "can_submit", label: "Submit", type: "select", options: [{label: "Yes", value: "true"}, {label: "No", value: "false"}] }
            ]
          }
        ]}
        onSubmit={async (data) => {
          // Flatten permissions from table (ensure bools)
          const perms = data.permissions.map((p: any) => ({
            ...p,
            can_read: String(p.can_read) === "true",
            can_write: String(p.can_write) === "true",
            can_submit: String(p.can_submit) === "true"
          }));
          await api.post(`/api/system/roles/${selectedRole.id}/permissions`, perms);
          toast.success("Role permissions updated");
        }}
      />
    </div>
  );
}

