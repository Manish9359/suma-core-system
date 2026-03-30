import { useState } from "react";
import GenericModulePage from "./GenericModulePage";

export default function PurchasingPage() {
  const [tab, setTab] = useState<"Purchase Order" | "Purchase Receipt">("Purchase Order");
  
  const handlePOChange = (data: any) => {
    if(!data.items) return data;
    const items = data.items.map((it: any) => ({
      ...it,
      amount: Number(it.qty || 0) * Number(it.rate || 0)
    }));
    const total = items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
    return { ...data, items, total };
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="flex gap-4 border-b px-6 pt-4 bg-white">
        <button 
          onClick={() => setTab("Purchase Order")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Purchase Order" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Purchase Orders
        </button>
        <button 
          onClick={() => setTab("Purchase Receipt")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Purchase Receipt" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Goods Receipts (GRN)
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <GenericModulePage 
          key={tab} 
          doctype={tab} 
          title={tab}
          description={tab === "Purchase Order" 
            ? "Manage organizational spending and commitments." 
            : "Track material inflows and update actual warehouse stock."} 
          onRecordChange={tab === "Purchase Order" ? handlePOChange : undefined}
        />
      </div>
    </div>
  );
}

