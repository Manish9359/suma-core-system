import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, History, LayoutGrid, Clock, ShieldCheck, Link2, ArrowRight, AlertTriangle, CheckCircle2, XCircle, RotateCcw, PackageCheck, Package } from "lucide-react";
import { api, docApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { getAvailableActions, getStatusColor, DOCUMENT_CHAINS, CALC_RULES, type DocStatus } from "@/lib/docEngine";

export interface RecordField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "table" | "link" | "float";
  required?: boolean;
  disabled?: boolean;
  options?: any;
  columns?: RecordField[];
  fetch_from?: string;
}

// ─── Stock Balance Cache ───
const stockCache: Record<string, { qty: number; name: string; loading: boolean }> = {};

async function fetchStockBalance(itemCode: string): Promise<{ qty: number; name: string }> {
  if (stockCache[itemCode] && !stockCache[itemCode].loading) {
    return stockCache[itemCode];
  }
  try {
    stockCache[itemCode] = { qty: 0, name: "", loading: true };
    const data = await (await import("@/lib/api")).api.get<any>(`/api/v1/engine/stock_balance/${encodeURIComponent(itemCode)}`);
    const result = { qty: data.total_qty || 0, name: data.item_name || itemCode, loading: false };
    stockCache[itemCode] = result;
    return result;
  } catch {
    // Fallback to local store
    const { localStore } = await import("@/lib/localStore");
    const balance = localStore.getStockBalance(itemCode);
    const result = { qty: balance.qty, name: balance.name, loading: false };
    stockCache[itemCode] = result;
    return result;
  }
}

// ─── Stock Indicator Badge ───
function StockBadge({ itemCode, requiredQty }: { itemCode: string; requiredQty: number }) {
  const [stock, setStock] = useState<{ qty: number; name: string } | null>(null);

  useEffect(() => {
    if (itemCode) {
      fetchStockBalance(itemCode).then(setStock);
    }
  }, [itemCode]);

  if (!itemCode || !stock) return null;

  const isLow = stock.qty < requiredQty;
  const isZero = stock.qty <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
        isZero
          ? "bg-destructive/10 text-destructive"
          : isLow
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700"
      }`}
      title={`Available: ${stock.qty} units`}
    >
      {isZero ? <XCircle className="h-2.5 w-2.5" /> : isLow ? <AlertTriangle className="h-2.5 w-2.5" /> : <PackageCheck className="h-2.5 w-2.5" />}
      {stock.qty} avail
    </span>
  );
}

// ─── Inline Table Editor with Stock Check ───
function DynamicTableInput({
  field,
  value = [],
  onChange,
  isSubmitted,
  showStock,
}: {
  field: RecordField;
  value: any[];
  onChange: (v: any[]) => void;
  isSubmitted?: boolean;
  showStock?: boolean;
}) {
  const [rows, setRows] = useState<any[]>(Array.isArray(value) ? value : []);

  useEffect(() => {
    if (Array.isArray(value)) setRows(value);
  }, [JSON.stringify(value)]);

  const addRow = () => {
    const newRow: any = {};
    field.columns?.forEach((c) => {
      newRow[c.name] = c.type === "number" || c.type === "float" ? 0 : "";
    });
    const updated = [...rows, newRow];
    setRows(updated);
    onChange(updated);
  };

  const updateRow = (idx: number, colName: string, val: any) => {
    const updated = [...rows];
    const newRow = { ...updated[idx], [colName]: val };

    // Row-level fetch_from (e.g. item_code -> rate, stock)
    field.columns?.forEach((c) => {
      if (c.fetch_from && c.fetch_from.startsWith(`${colName}.`)) {
        const sourceAttr = c.fetch_from.split(".")[1];
        const sourceCol = field.columns?.find((sc) => sc.name === colName);
          if (sourceCol && Array.isArray(sourceCol.options)) {
            const selectedOpt = sourceCol.options.find((opt: any) => String(opt.value) === String(val));
            console.log(`[Auto-Fill] Found Option:`, selectedOpt, "for value:", val);
            if (selectedOpt?.full_data) {
              console.log(`[Auto-Fill] Row ${idx} : Setting ${c.name} to`, selectedOpt.full_data[sourceAttr]);
              newRow[c.name] = selectedOpt.full_data[sourceAttr] || "";
            } else {
              console.warn(`[Auto-Fill] Row ${idx} : Missing full_data in option for`, c.name);
            }
          }
      }
    });

    updated[idx] = newRow;
    setRows(updated);
    onChange(updated);
  };

  const removeRow = (idx: number) => {
    const updated = rows.filter((_, i) => i !== idx);
    setRows(updated);
    onChange(updated);
  };

  // Check if any column is an item_code field
  const itemCodeCol = field.columns?.find((c) => c.name === "item_code");
  const qtyCol = field.columns?.find((c) => c.name === "qty");

  return (
    <div className="border rounded-lg overflow-hidden bg-card mt-1 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-2 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider w-8">#</th>
              {field.columns?.map((c) => (
                <th key={c.name} className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">
                  {c.label || c.name}
                </th>
              ))}
              {showStock && itemCodeCol && (
                <th className="px-2 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">Stock</th>
              )}
              {!isSubmitted && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-2 py-2 text-muted-foreground font-mono">{idx + 1}</td>
                {field.columns?.map((c) => (
                  <td key={c.name} className="p-1.5">
                    {c.type === "select" || c.type === "link" ? (
                      <Select
                        value={row[c.name] !== undefined ? String(row[c.name]) : ""}
                        onValueChange={(val) => updateRow(idx, c.name, val)}
                        disabled={isSubmitted || c.disabled}
                      >
                        <SelectTrigger className="h-8 text-[11px] bg-card">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(c.options)
                            ? c.options.map((opt: any, oidx: number) => {
                                const val = typeof opt === "string" ? opt : opt.value;
                                const lbl = typeof opt === "string" ? opt : opt.label;
                                return (
                                  <SelectItem key={oidx} value={String(val)}>
                                    {String(lbl)}
                                  </SelectItem>
                                );
                              })
                            : <SelectItem value="_" disabled>No options</SelectItem>}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-8 text-[11px] bg-card"
                        type={c.type === "number" || c.type === "float" ? "number" : "text"}
                        value={row[c.name] !== undefined ? String(row[c.name]) : ""}
                        onChange={(e) =>
                          updateRow(idx, c.name, c.type === "number" || c.type === "float" ? Number(e.target.value) : e.target.value)
                        }
                        disabled={isSubmitted || c.disabled}
                      />
                    )}
                  </td>
                ))}
                {showStock && itemCodeCol && (
                  <td className="p-1.5">
                    <StockBadge itemCode={row.item_code} requiredQty={Number(row.qty || 0)} />
                  </td>
                )}
                {!isSubmitted && (
                  <td className="p-1 text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeRow(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isSubmitted && (
        <Button type="button" variant="ghost" size="sm" className="w-full h-8 text-[11px] border-t rounded-none text-primary" onClick={addRow}>
          <Plus className="h-3 w-3 mr-1" /> Add Row
        </Button>
      )}
    </div>
  );
}

// ─── Status Indicator ───
function StatusIndicator({ status }: { status: DocStatus }) {
  const icon =
    status === "Submitted" ? <CheckCircle2 className="h-4 w-4" /> :
    status === "Cancelled" ? <XCircle className="h-4 w-4" /> :
    status === "Amended" ? <RotateCcw className="h-4 w-4" /> :
    <Clock className="h-4 w-4" />;

  return (
    <Badge variant="outline" className={`${getStatusColor(status)} px-3 py-1.5 text-xs font-semibold gap-1.5`}>
      {icon} {status}
    </Badge>
  );
}

// ─── Main Modal ───
export function RecordModal({
  open, onOpenChange, title, description, fields, onSubmit, initialData = {}, doctype, onChangeData,
}: any) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [activity, setActivity] = useState<any[]>([]);

  const currentStatus: DocStatus = formData.workflow_state || formData.status || "Draft";
  const isSubmitted = currentStatus === "Submitted";
  const isCancelled = currentStatus === "Cancelled";
  const isReadonly = isSubmitted;
  const availableActions = getAvailableActions(currentStatus);
  const docLinks = DOCUMENT_CHAINS[doctype] || [];

  // Should we show stock balance? Only for Sales Invoice, Delivery Note, Quotation, Sales Order
  const showStock = ["Sales Invoice", "Quotation", "Sales Order", "Delivery Note"].includes(doctype);

  useEffect(() => {
    if (open) {
      setFormData(initialData || {});
      setActiveTab("general");
      if (initialData?.id && doctype) {
        api.get<any[]>(`/api/v1/doc/${doctype}/${initialData.id}/activity`)
          .then((res) => setActivity(Array.isArray(res) ? res : []))
          .catch(() => setActivity([]));
      } else {
        setActivity([]);
      }
    }
  }, [open, JSON.stringify(initialData || {}), doctype]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Stock validation before save for invoice-type docs
    if (showStock && formData.items) {
      for (const item of formData.items) {
        if (item.item_code && item.qty) {
          try {
            const stock = await fetchStockBalance(item.item_code);
            if (stock.qty < Number(item.qty)) {
              const proceed = confirm(
                `⚠️ Insufficient stock for ${stock.name || item.item_code}!\n\nRequired: ${item.qty}\nAvailable: ${stock.qty}\n\nDo you want to continue anyway?`
              );
              if (!proceed) return;
            }
          } catch {
            // If stock check fails, continue with save
          }
        }
      }
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = useCallback((name: string, value: any) => {
    console.log(`[handleFieldChange] Triggered for: ${name} = ${value}`);
    setFormData((prev: any) => {
      let newData = { ...prev, [name]: value };

      // Auto-fetch
      fields.forEach((f: RecordField) => {
        if (f.fetch_from && f.fetch_from.startsWith(`${name}.`)) {
          const sourceAttr = f.fetch_from.split(".")[1];
          const sourceField = fields.find((sf: RecordField) => sf.name === name);
          console.log(`[Auto-Fill Debug] Field ${f.name} wants ${sourceAttr} from ${name}. Found sourceField:`, !!sourceField);
          if (sourceField && Array.isArray(sourceField.options)) {
            const selectedOpt = sourceField.options.find((opt: any) => String(opt.value) === String(value));
            console.log(`[Auto-Fill] Found Customer Option:`, selectedOpt, "for:", value);
            if (selectedOpt?.full_data) {
              console.log(`[Auto-Fill] Setting ${f.name} to`, selectedOpt.full_data[sourceAttr]);
              newData[f.name] = selectedOpt.full_data[sourceAttr] || "";
            } else {
              console.warn(`[Auto-Fill] No full_data for option:`, selectedOpt);
            }
          } else {
            console.warn(`[Auto-Fill Debug] sourceField has no valid options array.`, sourceField);
          }
        }
      });

      // Auto-calculate
      const calcFn = CALC_RULES[doctype];
      if (calcFn) {
        newData = calcFn(newData);
      }
      if (typeof onChangeData === "function") {
        newData = onChangeData(newData);
      }

      return newData;
    });
  }, [fields, doctype, onChangeData]);

  const handleWorkflowAction = async (action: string) => {
    const wa = availableActions.find((a) => a.action === action);
    if (wa?.confirm && !confirm(wa.confirm)) return;

    setLoading(true);
    try {
      if (action === "submit") {
        await docApi.submit(doctype, initialData.id);
        toast.success("Document submitted — ledger entries posted");
      } else if (action === "cancel") {
        await docApi.cancel(doctype, initialData.id);
        toast.success("Document cancelled — entries reversed");
      } else if (action === "amend") {
        const amended = { ...formData, workflow_state: "Draft", status: "Draft", amended_from: initialData.id };
        delete amended.id;
        await docApi.create(doctype, amended);
        toast.success("Amended document created as Draft");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || `${action} failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleDocLink = async (link: any) => {
    setLoading(true);
    try {
      await api.post(`/api/v1/doc/${doctype}/${initialData.id}/convert?target=${encodeURIComponent(link.targetDoctype)}`);
      toast.success(`${link.targetLabel} created`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const namingPreview = formData.name || formData.id || (initialData?.id ? `#${initialData.id}` : "New");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 flex flex-col h-[88vh] overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 border-b shrink-0 bg-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold flex items-center gap-3">
                {title}
                {initialData?.id && <StatusIndicator status={currentStatus} />}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1 flex items-center gap-2">
                {description}
                {initialData?.id && (
                  <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded">{namingPreview}</span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 border-b bg-card">
            <TabsList className="bg-transparent h-11 p-0 gap-6">
              <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 h-full gap-2 text-sm">
                <LayoutGrid className="h-4 w-4" /> Details
              </TabsTrigger>
              {initialData?.id && (
                <>
                  <TabsTrigger value="connections" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 h-full gap-2 text-sm text-muted-foreground">
                    <Link2 className="h-4 w-4" /> Connections
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 h-full gap-2 text-sm text-muted-foreground">
                    <History className="h-4 w-4" /> Timeline
                    {activity.length > 0 && <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{activity.length}</span>}
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-muted/20">
            {/* Details Tab */}
            <TabsContent value="general" className="mt-0 outline-none">
              {isSubmitted && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-sm text-emerald-800">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Document Submitted</p>
                    <p className="text-xs text-emerald-600">Locked. Cancel and amend to make changes.</p>
                  </div>
                </div>
              )}
              {isCancelled && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex items-center gap-3 text-sm text-destructive">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Document Cancelled</p>
                    <p className="text-xs">Ledger entries reversed. Use "Amend" to create a corrected copy.</p>
                  </div>
                </div>
              )}

              <form id="record-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(Array.isArray(fields) ? fields : [])
                  .filter((f: RecordField) => f.name !== "id" && f.name !== "tenant_id")
                  .map((field: RecordField, idx: number) => {
                    const isFullWidth = field.type === "table" || fields.length === 1;
                    const isFieldReadonly = isReadonly || field.disabled;
                    const isCalcField = ["amount", "tax", "grand_total", "gross_salary", "net_salary", "progress", "total"].includes(field.name);

                    return (
                      <div key={field.name || idx} className={`flex flex-col gap-1.5 ${isFullWidth ? "md:col-span-2" : ""}`}>
                        <Label htmlFor={field.name} className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                          {field.label || field.name}
                          {field.required && <span className="text-destructive">*</span>}
                          {isCalcField && <span className="text-[9px] font-normal normal-case text-primary">(auto)</span>}
                          {field.fetch_from && <span className="text-[9px] font-normal normal-case text-primary">(auto-fetched)</span>}
                        </Label>

                        {field.type === "select" || field.type === "link" ? (
                          <Select
                            value={formData[field.name] !== undefined ? String(formData[field.name]) : ""}
                            onValueChange={(val) => handleFieldChange(field.name, val)}
                            disabled={isFieldReadonly}
                          >
                            <SelectTrigger className="bg-card"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {Array.isArray(field.options)
                                ? field.options.map((opt: any, oidx: number) => {
                                    const val = typeof opt === "string" ? opt : opt.value;
                                    const lbl = typeof opt === "string" ? opt : opt.label;
                                    return <SelectItem key={oidx} value={String(val)}>{String(lbl)}</SelectItem>;
                                  })
                                : null}
                            </SelectContent>
                          </Select>
                        ) : field.type === "table" ? (
                          <DynamicTableInput
                            field={field}
                            value={formData[field.name]}
                            onChange={(v) => handleFieldChange(field.name, v)}
                            isSubmitted={isReadonly}
                            showStock={showStock}
                          />
                        ) : (
                          <Input
                            id={field.name}
                            type={field.type === "number" || field.type === "float" ? "number" : field.type === "date" ? "date" : "text"}
                            step={field.type === "float" ? "0.01" : undefined}
                            className={`bg-card ${isCalcField ? "font-semibold text-primary bg-primary/5 border-primary/20" : ""}`}
                            disabled={isFieldReadonly || !!field.fetch_from}
                            value={formData[field.name] !== undefined ? String(formData[field.name]) : ""}
                            onChange={(e) =>
                              handleFieldChange(field.name, field.type === "number" || field.type === "float" ? Number(e.target.value) : e.target.value)
                            }
                          />
                        )}
                      </div>
                    );
                  })}
              </form>
            </TabsContent>

            {/* Connections Tab */}
            <TabsContent value="connections" className="mt-0 outline-none">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Document Links</h3>
                {docLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-6 text-center">No document chains for {doctype}.</p>
                ) : (
                  <div className="space-y-3">
                    {docLinks.map((link: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Link2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{link.targetLabel}</p>
                            <p className="text-xs text-muted-foreground">{link.doctype} → {link.targetDoctype}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline" size="sm" className="gap-1.5"
                          onClick={() => handleDocLink(link)}
                          disabled={loading || currentStatus !== "Submitted"}
                        >
                          Create <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {(formData.amended_from || formData.sales_order || formData.purchase_order) && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold mb-3">References</h3>
                    <div className="space-y-2">
                      {formData.amended_from && (
                        <div className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                          <RotateCcw className="h-4 w-4 text-amber-500" /> Amended from: <span className="font-mono text-xs">{formData.amended_from}</span>
                        </div>
                      )}
                      {formData.sales_order && (
                        <div className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                          <Link2 className="h-4 w-4 text-primary" /> Sales Order: <span className="font-mono text-xs">{formData.sales_order}</span>
                        </div>
                      )}
                      {formData.purchase_order && (
                        <div className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                          <Link2 className="h-4 w-4 text-primary" /> Purchase Order: <span className="font-mono text-xs">{formData.purchase_order}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0 outline-none">
              <div className="space-y-4 py-2">
                {activity.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground italic text-sm">No activity recorded yet.</div>
                ) : (
                  activity.map((log: any, idx: number) => (
                    <div key={idx} className="flex gap-4 relative">
                      <div className="w-8 h-8 rounded-full bg-card border flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{log.action}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">By {log.user_id === 0 ? "System" : `User #${log.user_id}`}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-card shrink-0">
          <div className="w-full flex items-center justify-between">
            <div className="flex gap-2">
              {initialData?.id &&
                availableActions.map((action) => (
                  <Button
                    key={action.action}
                    size="sm"
                    className={`${action.color} gap-1.5 shadow-sm`}
                    onClick={() => handleWorkflowAction(action.action)}
                    disabled={loading}
                  >
                    {action.action === "submit" && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {action.action === "cancel" && <XCircle className="h-3.5 w-3.5" />}
                    {action.action === "amend" && <RotateCcw className="h-3.5 w-3.5" />}
                    {action.label}
                  </Button>
                ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Close</Button>
              {!isReadonly && !isCancelled && (
                <Button type="submit" form="record-form" disabled={loading || activeTab !== "general"} className="shadow-sm">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {initialData?.id ? "Update" : "Save"}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
