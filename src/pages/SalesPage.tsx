import { useState } from "react";
import GenericModulePage from "./GenericModulePage";

export default function SalesPage() {
  const [tab, setTab] = useState<"Sales Invoice" | "Quotation">("Sales Invoice");

  // Calculation Logic for Invoices
  const handleInvoiceChange = (data: any) => {
     if (!data.items) return data;
     const items = data.items.map((it: any) => ({
        ...it,
        amount: Number(it.qty || 0) * Number(it.rate || 0)
     }));
     const subtotal = items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
     const taxRate = Number(data.gst_rate || 18);
     const taxAmount = (subtotal * taxRate) / 100;
     return { ...data, items, amount: subtotal, tax: taxAmount, grand_total: subtotal + taxAmount };
  };

  // Calculation Logic for Quotations
  const handleQuotationChange = (data: any) => {
    if (!data.items) return data;
    const items = data.items.map((it: any) => ({
       ...it,
       amount: Number(it.qty || 0) * Number(it.rate || 0) * (1 - (Number(it.disc_pct || 0) / 100))
    }));
    const total = items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
    return { ...data, items, amount: total, grand_total: total };
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="flex gap-4 border-b px-6 pt-4 bg-white">
        <button 
          onClick={() => setTab("Sales Invoice")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Sales Invoice" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Sales Invoices
        </button>
        <button 
          onClick={() => setTab("Quotation")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Quotation" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Quotations
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <GenericModulePage 
          key={tab} 
          doctype={tab} 
          title={tab}
          description={tab === "Sales Invoice" 
            ? "Manage revenue, taxes, and accounting ledger synchronization." 
            : "Generate professional price quotes for customers."} 
          onRecordChange={tab === "Sales Invoice" ? handleInvoiceChange : handleQuotationChange}
        />
      </div>
    </div>
  );
}

