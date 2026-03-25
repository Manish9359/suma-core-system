import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Wallet, Landmark, CreditCard, Plus } from "lucide-react";
import { accountingApi, crmApi, supplierApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { Badge } from "@/components/ui/badge";

const typeColors: Record<string, string> = {
  Asset: "status-badge status-active",
  Liability: "status-badge status-warning",
  Income: "status-badge status-open",
  Expense: "status-badge bg-destructive/10 text-destructive",
};

export default function AccountingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: accounts, isLoading, error, refetch } = useApiQuery(["accounting", "accounts"], accountingApi.getAccounts);
  const { data: summary } = useApiQuery(["accounting", "summary"], accountingApi.getSummary);
  const { data: ledger } = useApiQuery(["accounting", "ledger"], accountingApi.getLedger);
  const { data: payments, refetch: refetchPayments } = useApiQuery(["accounting", "payments"], accountingApi.getPayments);
  
  const { data: customers } = useApiQuery(["crm", "customers"], crmApi.getCustomers);
  const { data: suppliers } = useApiQuery(["purchasing", "suppliers"], supplierApi.getSuppliers);

  const paymentFields: RecordField[] = [
    { name: "date", label: "Date", type: "date", required: true },
    { name: "payment_type", label: "Type", type: "select", options: ["Receive", "Pay"] },
    { name: "party_type", label: "Party Type", type: "select", options: ["Customer", "Supplier"] },
    { name: "amount", label: "Amount (₹)", type: "number", required: true },
    { name: "mode_of_payment", label: "Mode", type: "select", options: ["Cash", "Bank", "UPI", "Cheque"] }
  ];

  if (isLoading) return <div className="module-page"><LoadingState message="Loading accounts..." /></div>;
  if (error) return <div className="module-page"><ErrorState message="Failed to load accounting data" onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounting</h1>
          <p className="text-sm text-muted-foreground">Chart of accounts, ledger, and financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <Button onClick={() => setModalOpen(true)} className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-200"><Plus className="h-4 w-4" />New Payment</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Total Revenue</p><p className="text-2xl font-extrabold mt-1 text-success">{summary?.total_revenue || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-red-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Total Expenses</p><p className="text-2xl font-extrabold mt-1 text-destructive">{summary?.total_expenses || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Net Profit</p><p className="text-2xl font-extrabold mt-1">{summary?.net_profit || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">GST Payable</p><p className="text-2xl font-extrabold mt-1 text-warning">{summary?.gst_payable || "₹0"}</p></div>
      </div>

      <Tabs defaultValue="coa" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="coa" className="gap-2 data-[state=active]:bg-background"><Landmark className="h-4 w-4" />Chart of Accounts</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2 data-[state=active]:bg-background"><Wallet className="h-4 w-4" />General Ledger</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 data-[state=active]:bg-background"><CreditCard className="h-4 w-4" />Payment Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="coa">
          {!accounts || accounts.length === 0 ? <EmptyState title="No accounts yet" /> : (
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <table className="data-table">
                <thead className="bg-muted/50"><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Balance</th></tr></thead>
                <tbody>
                  {accounts.map((a: any) => (
                    <tr key={a.code} className="hover:bg-accent/5 transition-colors">
                      <td className="font-mono text-xs">{a.code}</td>
                      <td className="font-medium">{a.name}</td>
                      <td><span className={typeColors[a.type]}>{a.type}</span></td>
                      <td className="font-semibold">{a.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="ledger">
          {!ledger || ledger.length === 0 ? <EmptyState title="No ledger entries found" /> : (
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <table className="data-table">
                <thead className="bg-muted/50">
                  <tr><th>Date</th><th>Account</th><th>Description</th><th className="text-right">Debit (₹)</th><th className="text-right">Credit (₹)</th></tr>
                </thead>
                <tbody>
                  {ledger.map((l: any) => (
                    <tr key={l.id} className="hover:bg-accent/5 transition-colors">
                      <td className="text-xs text-muted-foreground">{l.date}</td>
                      <td className="font-medium text-xs">{l.account}</td>
                      <td className="text-xs">{l.description}</td>
                      <td className="text-right font-mono text-emerald-600 font-medium">{l.debit > 0 ? l.debit.toLocaleString() : ""}</td>
                      <td className="text-right font-mono text-rose-600 font-medium">{l.credit > 0 ? l.credit.toLocaleString() : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {!payments || payments.length === 0 ? <EmptyState title="No payments recorded" /> : (
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              <table className="data-table">
                <thead className="bg-muted/50"><tr><th>ID</th><th>Date</th><th>Type</th><th>Party</th><th>Amount</th><th>Mode</th></tr></thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.id}</td>
                      <td>{p.date}</td>
                      <td><Badge variant={p.payment_type === 'Receive' ? 'secondary' : 'outline'}>{p.payment_type}</Badge></td>
                      <td>{p.party_type}: {p.party}</td>
                      <td className="font-bold">₹{p.amount.toLocaleString()}</td>
                      <td><div className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" />{p.mode_of_payment}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>

      <RecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Add New Payment Entry"
        fields={paymentFields}
        onSubmit={async (data) => {
          await accountingApi.createPayment(data);
          refetchPayments();
        }}
      />
    </div>
  );
}
