import { useState, useEffect } from "react";
import { PlusCircle, Search, Edit, Trash2, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LoadingState } from "@/components/LoadingState";
import { Badge } from "@/components/ui/badge";
import { getStatusColor, NamingSeries } from "@/lib/docEngine";
import { docStore, LOCAL_META } from "@/lib/localStore";

export default function GenericModulePage({
  doctype,
  title,
  description,
  onRecordChange,
}: {
  doctype: string;
  title?: string;
  description?: string;
  onRecordChange?: (data: any) => any;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<RecordField[]>([]);

  const printableTypes: Record<string, string> = {
    "Sales Invoice": "invoice",
    "Quotation": "quotation",
    "Purchase Order": "purchase_order",
    "Purchase Receipt": "purchase_receipt",
  };

  // Load metadata - try backend, fallback to local
  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      try {
        const remoteMeta = await api.get<any>(`/api/v1/doc/meta/${doctype}`);
        if (!cancelled) setMeta(remoteMeta);
      } catch {
        // Use local metadata
        if (!cancelled) setMeta(LOCAL_META[doctype] || { doctype, fields: [] });
      }
    };
    loadMeta();
    return () => { cancelled = true; };
  }, [doctype]);

  // Load records - try backend, fallback to local
  const loadRecords = async () => {
    try {
      const remoteRecords = await api.get<any[]>(`/api/v1/doc/${encodeURIComponent(doctype)}`);
      setRecords(Array.isArray(remoteRecords) ? remoteRecords : []);
    } catch {
      // Use local store
      setRecords(docStore.list(doctype));
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    loadRecords();
  }, [doctype]);

  // Resolve fields from meta
  useEffect(() => {
    if (!meta) return;
    const rawFields = meta.fields || [];

    const resolveFields = async () => {
      const resolved = await Promise.all(
        rawFields.map(async (f: any) => {
          const type = (f.fieldtype?.toLowerCase() || f.type?.toLowerCase() || "text").trim();
          let options = f.options;

          // Resolve link options from local store
          if (typeof options === "string" && !options.includes(",")) {
            const targetDocType = (options.startsWith("Link:") ? options.split(":")[1] : options).trim();
            if (/^[A-Z]/.test(targetDocType) && type !== "table") {
              try {
                let targetDocs: any[] = [];
                try {
                  targetDocs = await api.get<any[]>(`/api/v1/doc/${encodeURIComponent(targetDocType)}`);
                } catch {
                  targetDocs = docStore.list(targetDocType);
                }
                if (Array.isArray(targetDocs) && targetDocs.length > 0) {
                  options = targetDocs.map((d) => {
                    const val = d.id ?? d.sku ?? Object.values(d).find(v => v !== null && typeof v !== 'object') || '';
                    return {
                      label: d.company || d.item_name || d.customer_name || d.full_name || d.name || String(val),
                      value: val,
                      full_data: d,
                    };
                  });
                }
              } catch {
                options = options ? [options] : [];
              }
            }
          } else if (typeof options === "string") {
            options = options.split(",").map((o: string) => o.trim());
          }

          let columns: any[] = [];
          if (type === "table") {
            let childFields = Array.isArray(f.columns) ? f.columns : [];
            if (childFields.length === 0 && typeof f.options === "string") {
              try {
                const childMeta = await api.get<any>(`/api/v1/doc/meta/${encodeURIComponent(f.options)}`);
                childFields = childMeta?.fields || [];
              } catch {
                childFields = [];
              }
            }
            columns = childFields.map((cf: any) => ({
              name: cf.name,
              label: cf.label || cf.name,
              type: cf.fieldtype?.toLowerCase() === "int" || cf.fieldtype?.toLowerCase() === "float" || cf.fieldtype?.toLowerCase() === "number"
                ? "number" : cf.fieldtype?.toLowerCase() || cf.type?.toLowerCase() || "text",
              required: !!cf.required,
              disabled: !!cf.readonly || !!cf.disabled,
              fetch_from: cf.fetch_from,
              options: typeof cf.options === "string" ? cf.options.split(",").map((o: string) => o.trim()) : cf.options,
            }));
          }

          return {
            name: f.name,
            label: f.label || f.name,
            type: type === "int" || type === "float" || type === "number" ? "number" : type === "link" ? "link" : type,
            required: !!f.required,
            disabled: !!f.readonly || !!f.disabled,
            options,
            columns,
            fetch_from: f.fetch_from,
          };
        })
      );
      setFields(resolved);
    };

    resolveFields();
  }, [meta, doctype]);

  if (loading) return <div className="module-page"><LoadingState message={`Loading ${title || doctype}...`} /></div>;

  const namingPrefix = meta?.naming_prefix || "";
  const listColumns = fields.filter((f) => f.name !== "id" && f.name !== "tenant_id" && f.type !== "table" && !f.name.startsWith("_")).slice(0, 6);

  const getRecordId = (record: any): string | number => {
    if (record == null) return "";
    if (record.id !== undefined && record.id !== null) return record.id;
    if (record.sku !== undefined && record.sku !== null) return record.sku;
    const firstVal = Object.values(record).find((v) => v !== null && v !== undefined && typeof v !== "object");
    return (firstVal as string | number) ?? "";
  };

  const filteredRecords = records.filter((r) =>
    Object.values(r).some((val) => String(val).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = async (data: any) => {
    try {
      const recId = getRecordId(editingRecord);
      if (editingRecord && recId) {
        // Try backend, fallback to local
        try {
          await api.put(`/api/v1/doc/${doctype}/${recId}`, data);
        } catch {
          docStore.update(doctype, String(recId), data);
        }
        toast.success(`${doctype} updated`);
      } else {
        try {
          await api.post(`/api/v1/doc/${doctype}`, data);
        } catch {
          docStore.create(doctype, data);
        }
        toast.success(`${doctype} created`);
      }
      await loadRecords();
    } catch (e: any) {
      toast.error(e.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string | number) => {
    const record = records.find((r: any) => getRecordId(r) === id);
    if (record?.workflow_state === "Submitted" || record?.status === "Submitted") {
      toast.error("Cannot delete a submitted document. Cancel it first.");
      return;
    }
    if (confirm(`Are you sure you want to delete this ${doctype}?`)) {
      try {
        try {
          await api.delete(`/api/v1/doc/${doctype}/${id}`);
        } catch {
          docStore.delete(doctype, String(id));
        }
        toast.success(`${doctype} deleted`);
        await loadRecords();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete");
      }
    }
  };

  const totalRecords = records.length;
  const recordCount = filteredRecords.length;

  return (
    <div className="module-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            {title || doctype}
            <Badge variant="secondary" className="text-xs font-normal">{totalRecords}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">{description || `Manage ${doctype} records.`}</p>
          {namingPrefix && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Naming: {NamingSeries.getPrefix(namingPrefix)}XXXXX
            </p>
          )}
        </div>
        <Button onClick={() => { setEditingRecord(null); setModalOpen(true); }} className="gap-2 shadow-sm">
          <PlusCircle className="h-4 w-4" /> New {doctype}
        </Button>
      </div>

      {/* Data Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="py-3 px-5 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${doctype}...`}
                className="pl-9 h-9 bg-muted/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {searchQuery ? `${recordCount} of ${totalRecords}` : `${totalRecords} records`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {listColumns.map((c) => (
                    <th key={c.name}>{c.label}</th>
                  ))}
                  <th className="text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={listColumns.length + 1} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm">No records found</p>
                        <Button variant="outline" size="sm" onClick={() => { setEditingRecord(null); setModalOpen(true); }}>
                          Create first {doctype}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record: any) => (
                    <tr
                      key={getRecordId(record)}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => { setEditingRecord(record); setModalOpen(true); }}
                    >
                      {listColumns.map((c) => (
                        <td key={c.name} className="truncate max-w-[200px]">
                          {(c.name === "status" || c.name === "workflow_state") ? (
                            <Badge variant="outline" className={`${getStatusColor(record[c.name])} text-[10px] font-semibold`}>
                              {record[c.name]}
                            </Badge>
                          ) : c.type === "number" || c.type === "float" ? (
                            <span className="font-mono text-sm">
                              {typeof record[c.name] === "number" ? record[c.name].toLocaleString("en-IN") : record[c.name]}
                            </span>
                          ) : (
                            record[c.name]
                          )}
                        </td>
                      ))}
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {printableTypes[doctype] && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-accent"
                              title="Print / PDF"
                              onClick={() => {
                                const id = getRecordId(record);
                                const type = printableTypes[doctype];
                                window.open(type === "invoice" ? `/invoice/${id}` : `/print/${type}/${id}`, "_blank");
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditingRecord(record); setModalOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(getRecordId(record))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <RecordModal
        open={modalOpen}
        onOpenChange={(v: boolean) => { setModalOpen(v); if (!v) loadRecords(); }}
        title={getRecordId(editingRecord) ? `${doctype} — ${editingRecord.name || getRecordId(editingRecord)}` : `New ${doctype}`}
        fields={fields}
        initialData={editingRecord}
        onChangeData={onRecordChange}
        onSubmit={handleSave}
        doctype={doctype}
      />
    </div>
  );
}
