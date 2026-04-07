import { useState } from "react";
import GenericModulePage from "./GenericModulePage";

export default function CRMPage() {
  const [tab, setTab] = useState<"Lead" | "Customer">("Lead");

  return (
    <div className="flex flex-col h-full">
      {/* CRM Global Navigation / Tabs */}
      <div className="flex gap-4 border-b px-6 pt-4 bg-card">
        <button 
          onClick={() => setTab("Lead")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Lead" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Leads Pipeline
        </button>
        <button 
          onClick={() => setTab("Customer")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Customer" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Customer Directory
        </button>
      </div>

      {/* Render the dynamically generated Metadata page based on the selected tab */}
      <div className="flex-1 relative">
        <GenericModulePage 
          key={tab} 
          doctype={tab} 
          title={tab === "Lead" ? "Lead Management" : "Customer Database"}
          description={tab === "Lead" 
            ? "Track and convert inbound opportunities dynamically based on meta.json." 
            : "Manage established relationships and billing metadata."} 
        />
      </div>
    </div>
  );
}

