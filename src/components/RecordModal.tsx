import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, History, LayoutGrid, Clock, User as UserIcon, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export interface RecordField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "table";
  required?: boolean;
  disabled?: boolean;
  options?: any;
  columns?: RecordField[];
  fetch_from?: string; // Example: "customer.customer_name"
}

function DynamicTableInput({ field, value = [], onChange }: { field: RecordField, value: any[], onChange: (v: any[]) => void }) {
  const [rows, setRows] = useState<any[]>(Array.isArray(value) ? value : []);

  useEffect(() => {
    if (Array.isArray(value)) setRows(value);
  }, [JSON.stringify(value)]);

  const addRow = () => {
    const newRow: any = {};
    field.columns?.forEach(c => {
      newRow[c.name] = c.type === "number" ? 0 : "";
    });
    const updated = [...rows, newRow];
    setRows(updated);
    onChange(updated);
  };

  const updateRow = (idx: number, colName: string, val: any) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [colName]: val };
    setRows(updated);
    onChange(updated);
  };

  const removeRow = (idx: number) => {
    const updated = rows.filter((_, i) => i !== idx);
    setRows(updated);
    onChange(updated);
  };

  return (
    <div className="border rounded-md overflow-hidden bg-white mt-1">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>
              {field.columns?.map(c => (
                <th key={c.name} className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">{c.label || c.name}</th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50">
                {field.columns?.map(c => (
                  <td key={c.name} className="p-2">
                    {c.type === "select" || c.type === "link" ? (
                      <Select 
                        value={row[c.name] !== undefined ? String(row[c.name]) : ""} 
                        onValueChange={(val) => updateRow(idx, c.name, val)}
                      >
                        <SelectTrigger className="h-8 text-[11px] bg-white"><SelectValue placeholder="Select..."/></SelectTrigger>
                        <SelectContent>
                          {Array.isArray(c.options) ? c.options.map((opt: any, oidx: number) => {
                            const val = typeof opt === "string" ? opt : opt.value;
                            const lbl = typeof opt === "string" ? opt : opt.label;
                            return <SelectItem key={oidx} value={String(val)}>{String(lbl)}</SelectItem>
                          }) : <SelectItem value="_" disabled>No options</SelectItem>}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        className="h-8 text-[11px] bg-white" 
                        type={c.type === "number" ? "number" : "text"} 
                        value={row[c.name] !== undefined ? String(row[c.name]) : ""} 
                        onChange={(e) => updateRow(idx, c.name, c.type === "number" ? Number(e.target.value) : e.target.value)} 
                        disabled={c.disabled}
                      />
                    )}
                  </td>
                ))}
                <td className="p-1 text-center">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="ghost" size="sm" className="w-full h-8 text-[11px] border-t rounded-none" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1"/> Add Row
      </Button>
    </div>
  );
}

export function RecordModal({ open, onOpenChange, title, description, fields, onSubmit, initialData = {}, doctype, ...props }: any) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setFormData(initialData || {});
      setActiveTab("general");
      if (initialData?.id && doctype) {
        api.get<any[]>(`/api/v1/doc/${doctype}/${initialData.id}/activity`)
          .then(res => setActivity(Array.isArray(res) ? res : []))
          .catch(() => setActivity([]));
      } else {
        setActivity([]);
      }
    }
  }, [open, JSON.stringify(initialData || {}), doctype]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev: any) => {
      let newData = { ...prev, [name]: value };
      
      // 1. Auto-fetch logic: Check if any other fields depend on this change
      fields.forEach((f: RecordField) => {
        if (f.fetch_from && f.fetch_from.startsWith(`${name}.`)) {
          const sourceAttr = f.fetch_from.split(".")[1];
          // Find the source field to get the selected option's full data
          const sourceField = fields.find((sf: RecordField) => sf.name === name);
          if (sourceField && Array.isArray(sourceField.options)) {
            const selectedOpt = sourceField.options.find((opt: any) => opt.value === value);
            if (selectedOpt && selectedOpt.full_data) {
                newData[f.name] = selectedOpt.full_data[sourceAttr] || "";
            }
          }
        }
      });
      
      // 2. Calculation Logic (from parent)
      if (typeof props.onChangeData === "function") {
         newData = props.onChangeData(newData);
      }
      
      return newData;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] p-0 flex flex-col h-[85vh] overflow-hidden">
        <DialogHeader className="p-6 border-b shrink-0 bg-white">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          {description && <DialogDescription className="text-xs">{description}</DialogDescription>}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b bg-white">
            <TabsList className="bg-transparent h-12 p-0 gap-6">
              <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 h-full gap-2">
                <LayoutGrid className="h-4 w-4" /> Details
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 h-full gap-2 text-slate-500">
                <History className="h-4 w-4" /> Timeline {activity.length > 0 && <span className="bg-slate-100 px-1.5 py-0.5 rounded-full text-[10px]">{activity.length}</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            <TabsContent value="general" className="mt-0 outline-none">
              <form id="record-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(Array.isArray(fields) ? fields : []).map((field, idx) => {
                  const isFullWidth = field.type === "table" || fields.length === 1;
                  return (
                    <div key={field.name || idx} className={`flex flex-col gap-1.5 ${isFullWidth ? "md:col-span-2" : ""}`}>
                      <Label htmlFor={field.name} className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {field.label || field.name}
                      </Label>
                      {field.type === "select" ? (
                        <Select 
                          value={formData[field.name] !== undefined ? String(formData[field.name]) : ""} 
                          onValueChange={(val) => handleFieldChange(field.name, val)}
                          disabled={field.disabled}
                        >
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Select..."/></SelectTrigger>
                          <SelectContent>
                             {Array.isArray(field.options) ? field.options.map((opt: any, oidx: number) => {
                               const val = typeof opt === "string" ? opt : opt.value;
                               const lbl = typeof opt === "string" ? opt : opt.label;
                               return <SelectItem key={oidx} value={String(val)}>{String(lbl)}</SelectItem>
                             }) : null}
                          </SelectContent>
                        </Select>
                      ) : field.type === "table" ? (
                        <DynamicTableInput field={field} value={formData[field.name]} onChange={(v) => handleFieldChange(field.name, v)} />
                      ) : (
                        <Input
                          id={field.name}
                          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                          className="bg-white"
                          disabled={field.disabled}
                          value={formData[field.name] !== undefined ? String(formData[field.name]) : ""}
                          onChange={(e) => handleFieldChange(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </form>
            </TabsContent>

            <TabsContent value="timeline" className="mt-0 outline-none">
              <div className="space-y-6 py-2">
                {activity.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 italic text-sm">No activity recorded yet.</div>
                ) : activity.map((log, idx) => (
                  <div key={idx} className="flex gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                         <span className="font-bold text-sm">{log.action}</span>
                         <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        By {log.user_id === 0 ? "System" : `User #${log.user_id}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-4 border-t bg-white shrink-0 flex items-center justify-between">
          <div className="flex gap-2">
            {initialData?.id && (
              <>
                {formData.status === "Draft" && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    setLoading(true);
                    try {
                      await api.post(`/api/v1/doc/${doctype}/${initialData.id}/submit`);
                      toast.success("Document Submitted");
                      onOpenChange(false);
                    } catch (e: any) { toast.error(e.detail || "Submission failed"); }
                    setLoading(false);
                  }}>Submit</Button>
                )}
                
                {/* Stage Conversions */}
                {doctype === "Opportunity" && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      await api.post(`/api/v1/doc/Opportunity/${initialData.id}/convert?target=Quotation`);
                      toast.success("Quotation Created");
                      onOpenChange(false);
                    } catch (e: any) { toast.error(e.detail || "Conversion failed"); }
                  }}>Create Quotation</Button>
                )}
                {doctype === "Quotation" && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      await api.post(`/api/v1/doc/Quotation/${initialData.id}/convert?target=Sales Order`);
                      toast.success("Sales Order Created");
                      onOpenChange(false);
                    } catch (e: any) { toast.error(e.detail || "Conversion failed"); }
                  }}>Create Order</Button>
                )}
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            {formData.status !== "Submitted" && (
              <Button type="submit" form="record-form" disabled={loading || activeTab !== "general"}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData?.id ? "Update Document" : "Save Document"}
              </Button>
            )}
            {formData.status === "Submitted" && (
              <Badge variant="secondary" className="px-4 py-2 bg-green-50 text-green-700 border-green-200">
                <ShieldCheck className="h-4 w-4 mr-2" /> Document Submitted
              </Badge>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
