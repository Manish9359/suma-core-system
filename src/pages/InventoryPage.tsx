import { useState } from "react";
import GenericModulePage from "./GenericModulePage";

export default function InventoryPage() {
  const [tab, setTab] = useState<"Product" | "Warehouse">("Product");

  return (
    <div className="flex flex-col h-full">
      {/* Global Navigation / Tabs */}
      <div className="flex gap-4 border-b px-6 pt-4 bg-white">
        <button 
          onClick={() => setTab("Product")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Product" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Product Catalog
        </button>
        <button 
          onClick={() => setTab("Warehouse")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Warehouse" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Warehouse Network
        </button>
      </div>

      <div className="flex-1 bg-slate-50 relative">
        <GenericModulePage 
          key={tab} 
          doctype={tab} 
          title={tab === "Product" ? "Product Catalog" : "Warehouse Network"}
          description={tab === "Product" 
            ? "Manage parts, raw materials, and finished goods through central metadata." 
            : "Control storage nodes globally."} 
        />
      </div>
    </div>
  );
}
