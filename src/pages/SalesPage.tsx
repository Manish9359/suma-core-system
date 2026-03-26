import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download, Printer, Trash2, FileText, Package, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { salesApi, crmApi, inventoryApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusMap: Record<string, string> = {
  Paid: "status-badge status-active",
  Pending: "status-badge status-warning",
  Overdue: "status-badge bg-destructive/10 text-destructive",
  Sent: "status-badge status-open",
  Draft: "status-badge status-closed",
};

export default function SalesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [qtnModalOpen, setQtnModalOpen] = useState(false);
  const [editingQtn, setEditingQtn] = useState<any>(null);
  const { data: invoices, isLoading: invLoading, error: invError, refetch: refetchInv } = useApiQuery(["sales", "invoices"], salesApi.getInvoices);
  const { data: quotations, refetch: refetchQtn } = useApiQuery(["sales", "quotations"], salesApi.getQuotations);
  const { data: summary } = useApiQuery(["sales", "summary"], salesApi.getSummary);

  const { data: customers } = useApiQuery(["crm", "customers"], crmApi.getCustomers);
  const { data: products } = useApiQuery(["inventory", "products"], inventoryApi.getProducts);

  const itemColumns = [
    {
      name: "item_code", label: "Item", type: "select" as const, options: products?.map(p => ({
        label: p.name, value: p.sku,
        autoFill: { qty: 1, rate: p.sell, disc_pct: (p.cost && p.sell) ? parseFloat((((Number(p.sell) - Number(p.cost)) / Number(p.sell)) * 100).toFixed(1)) : 0 }
      })) || []
    },
    { name: "qty", label: "Qty", type: "number" as const },
    { name: "rate", label: "Rate (₹)", type: "number" as const },
    { name: "disc_pct", label: "Disc %", type: "number" as const }
  ];

  const invoiceFields: RecordField[] = [
    { name: "customer", label: "Customer", type: "select", required: true, options: customers?.map(c => ({ label: c.company, value: c.company })) || [] },
    { name: "date", label: "Invoice Date", type: "date", required: true },
    {
      name: "items", label: "Invoice Items", type: "table", required: true,
      columns: itemColumns
    },
    { name: "gst_rate", label: "GST Rate (%)", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["Draft", "Sent", "Paid", "Overdue"] },
    { name: "_amount", label: "Subtotal (₹)", type: "number", disabled: true },
    { name: "_discount", label: "Total Discount (₹)", type: "number", disabled: true },
    { name: "_cgst", label: "CGST (₹)", type: "number", disabled: true },
    { name: "_sgst", label: "SGST (₹)", type: "number", disabled: true },
    { name: "_grand_total", label: "Grand Total (₹)", type: "number", disabled: true }
  ];

  const calcChange = (data: any) => {
    const items = Array.isArray(data.items) ? data.items : [];
    const total = items.reduce((acc: number, item: any) => acc + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
    const discFromItems = items.reduce((acc: number, item: any) => {
      const lineAmt = Number(item.qty || 0) * Number(item.rate || 0);
      return acc + lineAmt * (Number(item.disc_pct || 0) / 100);
    }, 0);
    const taxable = Math.max(total - discFromItems, 0);
    const r = Number(data.gst_rate || 0);
    const cgst = r > 0 ? parseFloat((taxable * (r / 2) / 100).toFixed(2)) : 0;
    return { ...data, _amount: total, _discount: parseFloat(discFromItems.toFixed(2)), _cgst: cgst, _sgst: cgst, _grand_total: parseFloat((taxable + cgst * 2).toFixed(2)) };
  };

  const buildPayload = (data: any) => {
    const { _amount, _discount, _cgst, _sgst, _grand_total, custom_data: _cd, cgst, sgst, taxable, gst_rate, ...rest } = data;
    const discFromItems = (data.items || []).reduce((acc: number, item: any) => {
      const lineAmt = Number(item.qty || 0) * Number(item.rate || 0);
      return acc + lineAmt * (Number(item.disc_pct || 0) / 100);
    }, 0);
    
    const itemsTotal = (data.items || []).reduce((acc: number, item: any) => acc + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
    const subtotal = Math.max(itemsTotal - discFromItems, 0);
    const r = Number(gst_rate || 0);
    const taxAmt = subtotal * (r / 100);

    return { 
      ...rest, 
      discount: parseFloat(discFromItems.toFixed(2)), 
      tax_rate: r, 
      tax: parseFloat(taxAmt.toFixed(2)),
      custom_data: { gst_rate: r, status: data.status || "Draft" } 
    };
  };

  const qtnFields = [
    { name: "customer", label: "Customer", type: "select" as const, required: true, options: customers?.map(c => ({ label: c.company, value: c.company })) || [] },
    { name: "date", label: "Quotation Date", type: "date" as const, required: true },
    { name: "valid_till", label: "Valid Till", type: "date" as const },
    { name: "items", label: "Items", type: "table" as const, required: true, columns: itemColumns },
    { name: "gst_rate", label: "GST Rate (%)", type: "number" as const },
    { name: "status", label: "Status", type: "select" as const, options: ["Draft", "Sent", "Accepted", "Rejected"] },
    { name: "_amount", label: "Subtotal (₹)", type: "number" as const, disabled: true },
    { name: "_discount", label: "Total Discount (₹)", type: "number" as const, disabled: true },
    { name: "_cgst", label: "CGST (₹)", type: "number" as const, disabled: true },
    { name: "_sgst", label: "SGST (₹)", type: "number" as const, disabled: true },
    { name: "_grand_total", label: "Grand Total (₹)", type: "number" as const, disabled: true }
  ];

  if (invLoading) return <div className="module-page"><LoadingState message="Loading sales..." /></div>;
  if (invError) return <div className="module-page"><ErrorState message="Failed to load sales data" onRetry={refetchInv} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="text-sm text-muted-foreground">Manage order life cycle and billing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <Button onClick={() => { setEditingInvoice(null); setModalOpen(true); }} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" />New Invoice</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card bg-gradient-to-br from-blue-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Total Invoiced</p><p className="text-2xl font-extrabold mt-1">{summary?.total_invoiced || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Received</p><p className="text-2xl font-extrabold mt-1 text-success">{summary?.received || "₹0"}</p></div>
        <div className="kpi-card bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-sm"><p className="text-xs text-muted-foreground font-medium">Outstanding</p><p className="text-2xl font-extrabold mt-1 text-warning">{summary?.outstanding || "₹0"}</p></div>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="invoices" className="gap-2 data-[state=active]:bg-background"><Receipt className="h-4 w-4" />Invoices</TabsTrigger>
          <TabsTrigger value="quotations" className="gap-2 data-[state=active]:bg-background"><FileText className="h-4 w-4" />Quotations</TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2 data-[state=active]:bg-background"><Package className="h-4 w-4" />Delivery Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." className="pl-9 h-9" />
            </div>
          </div>
          {!invoices || invoices.length === 0 ? <EmptyState title="No invoices yet" /> : (
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead className="bg-muted/50"><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-accent/5 transition-colors">
                        <td className="font-mono text-xs font-medium">{inv.id}</td>
                        <td>{inv.customer}</td>
                        <td className="text-muted-foreground">{inv.date}</td>
                        <td className="font-semibold">{inv.amount}</td>
                        <td><span className={statusMap[inv.status]}>{inv.status}</span></td>
                        <td className="flex gap-1 justify-end items-center">
                          <Button variant="ghost" size="sm" className="text-xs" onClick={async () => {
                            try {
                              const detailed = await salesApi.getInvoice(inv.id);
                              setEditingInvoice({ ...detailed, ...detailed.custom_data, status: detailed.status });
                              setModalOpen(true);
                            } catch (e) { console.error(e); }
                          }}>Edit</Button>
                          <Link to={`/print/invoice/${inv.id}`} target="_blank"><Button variant="ghost" size="icon" className="h-8 w-8 text-accent"><Printer className="h-3.5 w-3.5" /></Button></Link>
                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={async () => {
                            if (confirm(`Delete Invoice ${inv.id}?`)) { await salesApi.deleteInvoice(inv.id); refetchInv(); }
                          }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quotations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search quotations..." className="pl-9 h-9" /></div>
            <Button size="sm" onClick={() => { setEditingQtn(null); setQtnModalOpen(true); }} className="gap-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg"><Plus className="h-3.5 w-3.5" />New Quotation</Button>
          </div>
          {!quotations || quotations.length === 0 ? <EmptyState title="No quotations yet" /> : (
            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <table className="data-table">
                  <thead className="bg-muted/50"><tr><th>Quote #</th><th>Customer</th><th>Date</th><th>Valid Till</th><th>Amount</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                  <tbody>
                    {quotations.map((q) => (
                      <tr key={q.id} className="hover:bg-accent/5 transition-colors">
                        <td className="font-mono text-xs font-medium">{q.id}</td>
                        <td className="font-medium">{q.customer}</td>
                        <td className="text-muted-foreground">{q.date}</td>
                        <td className="text-xs">{q.valid_till}</td>
                        <td className="font-semibold">₹{Number(q.grand_total || q.amount || 0).toLocaleString('en-IN')}</td>
                        <td><span className={statusMap[q.status] || "status-badge"}>{q.status}</span></td>
                        <td className="flex gap-1 justify-end items-center">
                          <Button variant="ghost" size="sm" className="text-xs" onClick={async () => {
                            const detailed = await salesApi.getQuotation(q.id);
                            setEditingQtn({ ...detailed, ...detailed.custom_data, status: detailed.status });
                            setQtnModalOpen(true);
                          }}>Edit</Button>
                          <Link to={`/print/quotation/${q.id}`} target="_blank"><Button variant="ghost" size="icon" className="h-8 w-8 text-violet-500"><Printer className="h-3.5 w-3.5" /></Button></Link>
                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={async () => {
                            if (confirm(`Delete Quotation ${q.id}?`)) { await salesApi.deleteQuotation(q.id); refetchQtn(); }
                          }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="delivery">
          <EmptyState title="No Delivery Notes" description="Ship items against confirmed orders to see delivery notes here." />
        </TabsContent>
      </Tabs>

      <RecordModal
        open={modalOpen}
        onOpenChange={(val) => { setModalOpen(val); if (!val) setEditingInvoice(null); }}
        title={editingInvoice ? "Edit Invoice" : "Create New Invoice"}
        description="Add customer details and line items"
        initialData={editingInvoice || { gst_rate: 18 }}
        fields={invoiceFields}
        onChangeData={calcChange}
        onSubmit={async (data) => {
          const payload = buildPayload(data);
          if (editingInvoice) await salesApi.updateInvoice(editingInvoice.id, payload);
          else await salesApi.createInvoice(payload);
          refetchInv();
          setEditingInvoice(null);
        }}
      />
      <RecordModal
        open={qtnModalOpen}
        onOpenChange={(val) => { setQtnModalOpen(val); if (!val) setEditingQtn(null); }}
        title={editingQtn ? "Edit Quotation" : "New Quotation"}
        description="Add customer and line items for quotation"
        initialData={editingQtn || { gst_rate: 0 }}
        fields={qtnFields}
        onChangeData={calcChange}
        onSubmit={async (data) => {
          const payload = buildPayload(data);
          if (editingQtn) await salesApi.updateQuotation(editingQtn.id, payload);
          else await salesApi.createQuotation(payload);
          refetchQtn();
          setEditingQtn(null);
        }}
      />
    </div>
  );
}
