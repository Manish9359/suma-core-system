import { useState } from "react";
import GenericModulePage from "./GenericModulePage";

export default function ManufacturingPage() {
  const [tab, setTab] = useState<"BOM" | "Work Order">("BOM");
  
  const handleBOMChange = (data: any) => {
    if(!data.items) return data;
    const items = data.items.map((it: any) => ({
      ...it,
      amount: Number(it.qty || 0) * Number(it.rate || 0)
    }));
    const total = items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
    return { ...data, items, total_cost: total };
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="flex gap-4 border-b px-6 pt-4 bg-white">
        <button 
          onClick={() => setTab("BOM")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "BOM" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Bill of Materials (BOM)
        </button>
        <button 
          onClick={() => setTab("Work Order")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Work Order" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Work Orders
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <GenericModulePage 
          key={tab} 
          doctype={tab} 
          title={tab}
          description={tab === "BOM" 
            ? "Define product recipes and calculate standard manufacturing costs." 
            : "Execute and monitor production processes on the shop floor."} 
          onRecordChange={tab === "BOM" ? handleBOMChange : undefined}
        />
      </div>
    </div>
  );
}
