/**
 * Document Engine — ERPNext-like client-side logic
 * Handles: Naming Series, Auto-Fetch, Calculations, Document Linking, Workflow
 */

// ─── Naming Series Generator (Client-side preview, server generates actual) ───
export class NamingSeries {
  static generate(pattern: string, currentCount: number = 0): string {
    if (!pattern) return "";
    const now = new Date();
    const res = pattern
      .replace(".YYYY.", String(now.getFullYear()))
      .replace(".MM.", String(now.getMonth() + 1).padStart(2, "0"))
      .replace(".DD.", String(now.getDate()).padStart(2, "0"));

    if (res.includes(".#")) {
      const [prefix, hashPart] = res.split(".#");
      const hashCount = hashPart.length + 1;
      const formatted = String(currentCount + 1).padStart(hashCount, "0");
      return `${prefix}${formatted}`;
    }
    return res;
  }

  static getPrefix(pattern: string): string {
    if (!pattern) return "";
    const now = new Date();
    const res = pattern
      .replace(".YYYY.", String(now.getFullYear()))
      .replace(".MM.", String(now.getMonth() + 1).padStart(2, "0"))
      .replace(".DD.", String(now.getDate()).padStart(2, "0"));
    if (res.includes(".#")) {
      return res.split(".#")[0];
    }
    return res;
  }
}

// ─── Document Status / Workflow ───
export type DocStatus = "Draft" | "Submitted" | "Cancelled" | "Amended";

export interface WorkflowAction {
  label: string;
  action: string;
  from: DocStatus[];
  to: DocStatus;
  color: string;
  icon?: string;
  confirm?: string;
}

export const WORKFLOW_ACTIONS: WorkflowAction[] = [
  {
    label: "Submit",
    action: "submit",
    from: ["Draft"],
    to: "Submitted",
    color: "bg-emerald-600 hover:bg-emerald-700 text-white",
    confirm: "Once submitted, this document cannot be edited. Are you sure?",
  },
  {
    label: "Cancel",
    action: "cancel",
    from: ["Submitted"],
    to: "Cancelled",
    color: "bg-destructive hover:bg-destructive/90 text-white",
    confirm: "This will reverse all ledger entries. Continue?",
  },
  {
    label: "Amend",
    action: "amend",
    from: ["Cancelled"],
    to: "Draft",
    color: "bg-amber-600 hover:bg-amber-700 text-white",
  },
];

export function getAvailableActions(status: DocStatus): WorkflowAction[] {
  return WORKFLOW_ACTIONS.filter((a) => a.from.includes(status));
}

// ─── Document Linking Chain ───
export interface DocLink {
  doctype: string;
  label: string;
  targetDoctype: string;
  targetLabel: string;
}

export const DOCUMENT_CHAINS: Record<string, DocLink[]> = {
  Lead: [{ doctype: "Lead", label: "Lead", targetDoctype: "Opportunity", targetLabel: "Create Opportunity" }],
  Opportunity: [{ doctype: "Opportunity", label: "Opportunity", targetDoctype: "Quotation", targetLabel: "Create Quotation" }],
  Quotation: [{ doctype: "Quotation", label: "Quotation", targetDoctype: "Sales Order", targetLabel: "Create Sales Order" }],
  "Sales Order": [
    { doctype: "Sales Order", label: "Sales Order", targetDoctype: "Delivery Note", targetLabel: "Create Delivery Note" },
    { doctype: "Sales Order", label: "Sales Order", targetDoctype: "Sales Invoice", targetLabel: "Create Invoice" },
  ],
  "Delivery Note": [{ doctype: "Delivery Note", label: "Delivery Note", targetDoctype: "Sales Invoice", targetLabel: "Create Invoice" }],
  "Sales Invoice": [{ doctype: "Sales Invoice", label: "Invoice", targetDoctype: "Payment Entry", targetLabel: "Create Payment" }],
  "Purchase Order": [
    { doctype: "Purchase Order", label: "PO", targetDoctype: "Purchase Receipt", targetLabel: "Create Receipt" },
    { doctype: "Purchase Order", label: "PO", targetDoctype: "Purchase Invoice", targetLabel: "Create Invoice" },
  ],
  "Purchase Receipt": [{ doctype: "Purchase Receipt", label: "Receipt", targetDoctype: "Purchase Invoice", targetLabel: "Create Invoice" }],
  "Work Order": [{ doctype: "Work Order", label: "Work Order", targetDoctype: "Stock Entry", targetLabel: "Create Stock Entry" }],
};

// ─── Auto-Calculation Engine ───
export interface CalcRule {
  doctype: string;
  calculate: (data: any) => any;
}

export const CALC_RULES: Record<string, (data: any) => any> = {
  "Sales Invoice": (data) => {
    if (!data.items) return data;
    const items = data.items.map((it: any) => ({
      ...it,
      amount: Number(it.qty || 0) * Number(it.rate || 0),
    }));
    const subtotal = items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
    const taxRate = Number(data.gst_rate || 18);
    const tax = (subtotal * taxRate) / 100;
    return { ...data, items, amount: subtotal, tax, grand_total: subtotal + tax };
  },
  Quotation: (data) => {
    if (!data.items) return data;
    const items = data.items.map((it: any) => ({
      ...it,
      amount: Number(it.qty || 0) * Number(it.rate || 0) * (1 - Number(it.disc_pct || 0) / 100),
    }));
    const total = items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
    return { ...data, items, amount: total, grand_total: total };
  },
  "Purchase Order": (data) => {
    if (!data.items) return data;
    const items = data.items.map((it: any) => ({
      ...it,
      amount: Number(it.qty || 0) * Number(it.rate || 0),
    }));
    const total = items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
    return { ...data, items, amount: total, grand_total: total };
  },
  "Purchase Receipt": (data) => {
    if (!data.items) return data;
    const items = data.items.map((it: any) => ({
      ...it,
      amount: Number(it.qty || 0) * Number(it.rate || 0),
    }));
    const total = items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
    return { ...data, items, amount: total, grand_total: total };
  },
  "Salary Slip": (data) => {
    const basic = Number(data.basic_salary || 0);
    const hra = Number(data.hra || 0);
    const da = Number(data.da || 0);
    const deductions = Number(data.pf || 0) + Number(data.tax || 0) + Number(data.other_deductions || 0);
    const gross = basic + hra + da;
    const net = gross - deductions;
    return { ...data, gross_salary: gross, net_salary: net };
  },
  "Work Order": (data) => {
    const planned = Number(data.planned_qty || 0);
    const completed = Number(data.completed_qty || 0);
    const progress = planned > 0 ? Math.round((completed / planned) * 100) : 0;
    return { ...data, progress };
  },
};

// ─── Auto-Fetch Field Resolver ───
export function resolveAutoFetch(
  fieldName: string,
  selectedValue: any,
  allFields: any[],
  linkedData: Record<string, any[]>
): Record<string, any> {
  const updates: Record<string, any> = {};
  
  allFields.forEach((f) => {
    if (f.fetch_from && f.fetch_from.startsWith(`${fieldName}.`)) {
      const [sourceName, sourceAttr] = f.fetch_from.split(".");
      const sourceRecords = linkedData[sourceName] || [];
      const matched = sourceRecords.find((r: any) => r.id === selectedValue || r.name === selectedValue);
      if (matched) {
        updates[f.name] = matched[sourceAttr] || "";
      }
    }
  });
  
  return updates;
}

// ─── Status Badge Colors ───
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    Draft: "bg-muted text-muted-foreground border-border",
    Submitted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    Amended: "bg-amber-50 text-amber-700 border-amber-200",
    Open: "bg-blue-50 text-blue-700 border-blue-200",
    "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
    Closed: "bg-muted text-muted-foreground border-border",
    Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Expired: "bg-destructive/10 text-destructive border-destructive/20",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Unpaid: "bg-amber-50 text-amber-700 border-amber-200",
    Overdue: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return map[status] || "bg-muted text-muted-foreground border-border";
}
