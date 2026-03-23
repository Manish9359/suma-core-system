import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

export type FieldType = "text" | "number" | "select" | "date" | "table";

export interface RecordField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string; value: string; autoFill?: any }[] | string[];
  columns?: RecordField[]; // for table type
}

export interface RecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: RecordField[];
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  onChangeData?: (data: any) => any;
}

function DynamicTableInput({ field, value = [], onChange }: { field: RecordField, value: any[], onChange: (v: any[]) => void }) {
  const [rows, setRows] = useState<any[]>(value);

  // Sync rows when parent passes new initial data (e.g. editing an existing invoice)
  useEffect(() => {
    if (value && value.length > 0) {
      setRows(value);
    }
  }, [JSON.stringify(value)]);

  const addRow = () => {
    const newRow: any = {};
    field.columns?.forEach(c => newRow[c.name] = c.type === "number" ? 0 : "");
    const updated = [...rows, newRow];
    setRows(updated);
    onChange(updated);
  };

  const updateRow = (idx: number, colName: string, val: any) => {
    const updated = [...rows];
    updated[idx][colName] = val;
    setRows(updated);
    onChange(updated);
  };

  const removeRow = (idx: number) => {
    const updated = rows.filter((_, i) => i !== idx);
    setRows(updated);
    onChange(updated);
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {field.columns?.map(c => <th key={c.name} className="px-2 py-1 text-left font-medium">{c.label}</th>)}
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t">
              {field.columns?.map(c => (
                <td key={c.name} className="p-1">
                  {c.type === "select" ? (
                    <Select value={row[c.name] || ""} onValueChange={(val) => {
                      const updated = [...rows];
                      updated[idx][c.name] = val;
                      const opt: any = c.options?.find((o: any) => (typeof o === "string" ? o : o.value) === val);
                      if (opt && typeof opt === "object" && opt.autoFill) {
                        for (const [k, v] of Object.entries(opt.autoFill)) {
                          updated[idx][k] = v;
                        }
                      }
                      setRows(updated);
                      onChange(updated);
                    }}>
                      <SelectTrigger className="h-8 text-xs px-2"><SelectValue placeholder="Select..."/></SelectTrigger>
                      <SelectContent>
                        {c.options?.map((opt: any) => {
                          const val = typeof opt === "string" ? opt : opt.value;
                          const lbl = typeof opt === "string" ? opt : opt.label;
                          return <SelectItem key={val} value={val}>{lbl}</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      className="h-8 text-xs px-2" 
                      type={c.type} 
                      value={row[c.name] || ""} 
                      onChange={(e) => updateRow(idx, c.name, c.type === "number" ? Number(e.target.value) : e.target.value)} 
                    />
                  )}
                </td>
              ))}
              <td className="p-1 text-center">
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRow(idx)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={(field.columns?.length || 0) + 1} className="p-4 text-center text-muted-foreground text-xs">No items added</td></tr>
          )}
        </tbody>
      </table>
      <div className="p-1 bg-muted/20 border-t">
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs w-full text-primary" onClick={addRow}>
          <Plus className="h-3 w-3 mr-1"/> Add Row
        </Button>
      </div>
    </div>
  );
}

export function RecordModal({ open, onOpenChange, title, description, fields, onSubmit, initialData = {}, onChangeData }: RecordModalProps) {
  const [formData, setFormData] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialData || {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(initialData)]);

  const handleChange = (name: string, value: any) => {
    let updated = { ...formData, [name]: value };
    if (onChangeData) updated = onChangeData(updated) || updated;
    setFormData(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      toast.success(`${title} saved successfully`);
      onOpenChange(false);
      setFormData({});
    } catch (err: any) {
      toast.error(err.message || "Failed to save record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <Label htmlFor={field.name} className={field.required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
                {field.label}
              </Label>
              {field.type === "select" ? (
                <Select
                  value={formData[field.name] || ""}
                  onValueChange={(val) => handleChange(field.name, val)}
                  required={field.required}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt: any) => {
                       const val = typeof opt === "string" ? opt : opt.value;
                       const lbl = typeof opt === "string" ? opt : opt.label;
                       return <SelectItem key={val} value={val}>{lbl}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              ) : field.type === "table" ? (
                <DynamicTableInput field={field} value={formData[field.name] || []} onChange={(v) => handleChange(field.name, v)} />
              ) : (
                <Input
                  id={field.name}
                  type={field.type}
                  required={field.required}
                  disabled={field.disabled}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.type === "number" ? Number(e.target.value) : e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}
          <DialogFooter className="pt-4 mt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
