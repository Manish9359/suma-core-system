import { useState } from "react";
import GenericModulePage from "./GenericModulePage";

export default function SalesPage() {
  const [tab, setTab] = useState<"Sales Invoice" | "Quotation" | "Sales Order">("Sales Invoice");

  const tabs = [
    { key: "Sales Invoice" as const, label: "Invoices" },
    { key: "Quotation" as const, label: "Quotations" },
    { key: "Sales Order" as const, label: "Orders" },
  ];

  const descriptions: Record<string, string> = {
    "Sales Invoice": "Create invoices with auto-numbering, GST calculation, and GL posting on submit.",
    "Quotation": "Generate price quotes. Convert to Sales Order when accepted.",
    "Sales Order": "Confirmed orders. Create Delivery Notes and Invoices from here.",
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
