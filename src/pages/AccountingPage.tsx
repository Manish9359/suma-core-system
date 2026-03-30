import { useState } from "react";
import GenericModulePage from "./GenericModulePage";

export default function AccountingPage() {
  const [tab, setTab] = useState<"Account" | "Payment Entry">("Account");
  
  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="flex gap-4 border-b px-6 pt-4 bg-white">
        <button 
          onClick={() => setTab("Account")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Account" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Chart of Accounts
        </button>
        <button 
          onClick={() => setTab("Payment Entry")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Payment Entry" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Payment Entries
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <GenericModulePage 
          key={tab} 
          doctype={tab} 
          title={tab}
          description={tab === "Account" 
            ? "Manage organizational ledger accounts and financial hierarchy." 
            : "Record cash and bank transactions for customers and suppliers."} 
        />
      </div>
    </div>
  );
}
