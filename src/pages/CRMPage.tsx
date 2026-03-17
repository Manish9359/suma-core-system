import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Phone, Mail, Building2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const leads = [
  { id: 1, name: "Rajesh Kumar", company: "SecureHome Pvt Ltd", phone: "+91 98765 43210", email: "rajesh@securehome.in", source: "Website", status: "New" },
  { id: 2, name: "Priya Sharma", company: "TechGuard Systems", phone: "+91 87654 32109", email: "priya@techguard.co", source: "Referral", status: "Contacted" },
  { id: 3, name: "Amit Patel", company: "SafeCity Solutions", phone: "+91 76543 21098", email: "amit@safecity.in", source: "Exhibition", status: "Qualified" },
  { id: 4, name: "Sunita Reddy", company: "WatchTower Corp", phone: "+91 65432 10987", email: "sunita@watchtower.com", source: "Cold Call", status: "Proposal" },
  { id: 5, name: "Vikram Singh", company: "EagleEye Securities", phone: "+91 54321 09876", email: "vikram@eagleeye.in", source: "Website", status: "New" },
];

const customers = [
  { id: "CUST-001", company: "Tech Solutions Ltd", contact: "Arun Mehta", gst: "27AABCT1234F1ZV" },
  { id: "CUST-002", company: "City Mall Management", contact: "Deepa Nair", gst: "27AABCM5678G2ZP" },
  { id: "CUST-003", company: "Green Valley School", contact: "Suresh Iyer", gst: "27AABCG9012H3ZQ" },
];

const statusColors: Record<string, string> = {
  New: "status-badge status-open",
  Contacted: "status-badge status-active",
  Qualified: "status-badge status-warning",
  Proposal: "status-badge bg-primary/10 text-primary",
};

export default function CRMPage() {
  const [tab, setTab] = useState<"leads" | "customers">("leads");

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="text-sm text-muted-foreground">Manage leads and customer relationships</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {tab === "leads" ? "Add Lead" : "Add Customer"}
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab("leads")} className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "leads" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Leads ({leads.length})
        </button>
        <button onClick={() => setTab("customers")} className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "customers" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Customers ({customers.length})
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" /> Filter
        </Button>
      </div>

      {tab === "leads" ? (
        <Card>
          <CardContent className="p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Company</th><th>Contact</th><th>Source</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="font-medium">{l.name}</td>
                    <td><div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{l.company}</div></td>
                    <td>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{l.email}</span>
                      </div>
                    </td>
                    <td><Badge variant="secondary">{l.source}</Badge></td>
                    <td><span className={statusColors[l.status] || "status-badge"}>{l.status}</span></td>
                    <td><Button variant="ghost" size="sm" className="gap-1 text-xs">Convert <ArrowRight className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="data-table">
              <thead>
                <tr><th>Customer ID</th><th>Company</th><th>Contact Person</th><th>GST Number</th></tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="font-mono text-xs">{c.id}</td>
                    <td className="font-medium">{c.company}</td>
                    <td>{c.contact}</td>
                    <td className="font-mono text-xs">{c.gst}</td>
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
