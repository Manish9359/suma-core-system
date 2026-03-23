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
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: company, refetch } = useApiQuery(["settings", "company"], () => api.get<any>("/api/settings/company"));
  const [form, setForm] = useState<any>({});

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
          <TabsTrigger value="bank" className="gap-2"><CreditCard className="h-4 w-4" /> Bank</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Alerts</TabsTrigger>
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

          <TabsContent value="notifications" className="focus-visible:outline-none">
            <Card className="border-none shadow-md">
              <CardHeader><CardTitle>Global Alerts</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div><p className="font-medium">Low Stock Alerts</p><p className="text-muted-foreground text-xs">Notify when items fall below 10 units.</p></div>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div><p className="font-medium">Large Invoice Workflow</p><p className="text-muted-foreground text-xs">Require manager approval on invoices over ₹50,000.</p></div>
                    <input type="checkbox" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="focus-visible:outline-none">
            <Card className="border-none shadow-md">
              <CardHeader><CardTitle>System Security</CardTitle></CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/30 border rounded-md text-sm text-muted-foreground space-y-1">
                  <p>Logged in as: <span className="font-semibold text-foreground">{user?.email}</span></p>
                  <p>Role: <span className="font-semibold text-foreground">{user?.role}</span></p>
                  <p className="mt-2">• JWT Authentication enforces token-based verification.</p>
                  <p>• Role Based Access Control (RBAC) securely enforced per endpoint.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}

