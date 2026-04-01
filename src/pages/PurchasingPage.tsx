import { useState } from "react";
import GenericModulePage from "./GenericModulePage";

type PurchaseTab = "Purchase Order" | "Purchase Receipt" | "Purchase Invoice";

export default function PurchasingPage() {
  const [tab, setTab] = useState<PurchaseTab>("Purchase Order");

  const tabs: { key: PurchaseTab; label: string }[] = [
    { key: "Purchase Order", label: "Purchase Orders" },
    { key: "Purchase Receipt", label: "Goods Receipts (GRN)" },
    { key: "Purchase Invoice", label: "Purchase Invoices" },
  ];

  const descriptions: Record<PurchaseTab, string> = {
    "Purchase Order": "Create POs for suppliers. Convert to Receipt or Invoice on completion.",
    "Purchase Receipt": "Record material inflows. Stock updated on submit.",
    "Purchase Invoice": "Supplier invoices with GST. GL entries posted on submit.",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 border-b px-6 pt-3 bg-card">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 relative overflow-auto">
        <GenericModulePage
          key={tab}
          doctype={tab}
          title={tab}
          description={descriptions[tab]}
        />
      </div>
    </div>
  );
}
