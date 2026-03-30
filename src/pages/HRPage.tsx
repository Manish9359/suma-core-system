import { useState } from "react";
import GenericModulePage from "./GenericModulePage";

export default function HRPage() {
  const [tab, setTab] = useState<"Employee" | "Attendance" | "Salary Slip">("Employee");

  return (
    <div className="flex flex-col h-full">
      {/* HR Global Navigation / Tabs */}
      <div className="flex gap-4 border-b px-6 pt-4 bg-white">
        <button 
          onClick={() => setTab("Employee")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Employee" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Staff Directory
        </button>
        <button 
          onClick={() => setTab("Attendance")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Attendance" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Attendance Logs
        </button>
        <button 
          onClick={() => setTab("Salary Slip")} 
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${tab === "Salary Slip" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Payroll & Slips
        </button>
      </div>

      {/* Render the dynamically generated Metadata page based on the selected tab */}
      <div className="flex-1 bg-slate-50 relative">
        <GenericModulePage 
          key={tab} 
          doctype={tab} 
          title={tab === "Employee" ? "Human Resources" : tab}
          description={tab === "Employee" 
            ? "Manage employee lifecycle and organizational structure." 
            : tab === "Attendance" 
              ? "Track daily employee presence and leave status."
              : "Process and manage employee payroll disbursements."} 
        />
      </div>
    </div>
  );
}
