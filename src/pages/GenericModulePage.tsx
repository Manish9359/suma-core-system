import { useState, useEffect } from "react";
import { PlusCircle, Search, Edit, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { useApiQuery } from "@/hooks/useApiQuery";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LoadingState, ErrorState } from "@/components/LoadingState";
import { Badge } from "@/components/ui/badge";

export default function GenericModulePage({ 
  doctype, 
  title, 
  description,
  onRecordChange 
}: { 
  doctype: string, 
  title?: string, 
  description?: string,
  onRecordChange?: (data: any) => any 
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch Metadata (The DocType Blueprint)
  const { data: meta, isLoading: metaLoading, error: metaError, refetch: refetchMeta } = useApiQuery(
    ["meta", doctype], 
    () => api.get<any>(`/api/v1/doc/meta/${doctype}`)
  );

  // 2. Fetch Actual Data
  const { data: records, isLoading: recordsLoading, refetch: refetchRecords } = useApiQuery(
    ["doc", doctype], 
    () => api.get<any[]>(`/api/v1/doc/${doctype}`)
  );

  const rawFields = meta?.fields || [];
  const [fields, setFields] = useState<RecordField[]>([]);

  // 3. Resolve Metadata (Links & Tables)
  useEffect(() => {
    const resolveFieldOptions = async (f: any) => {
      const type = (f.fieldtype?.toLowerCase() || f.type?.toLowerCase() || "text").trim();
      let options = f.options;
      
      if (typeof options === "string" && !options.includes(",")) {
        try {
          let targetDocType = (options.startsWith("Link:") ? options.split(":")[1] : options).trim();
          if (/^[A-Z]/.test(targetDocType) && type !== "table") {
            const targetDocs = await api.get<any[]>(`/api/v1/doc/${encodeURIComponent(targetDocType)}`);
            if (Array.isArray(targetDocs)) {
              options = targetDocs.map(d => ({ 
                label: d.customer_name || d.name || d.id, 
                value: d.id, 
                full_data: d 
              }));
            }
          }
        } catch {
          options = options ? [options] : [];
        }
      } else if (typeof options === "string") {
        options = options.split(",").map((o: string) => o.trim());
      }
      return options;
    };

    const resolveMetadata = async () => {
      const currentRawFields = meta?.fields || [];
      const resolved = await Promise.all(currentRawFields.map(async (f: any) => {
        const type = (f.fieldtype?.toLowerCase() || f.type?.toLowerCase() || "text").trim();
        let options = await resolveFieldOptions(f);
        let columns: any[] = [];

        // 2. Resolve child table columns
        if (type === "table") {
          let childFields = Array.isArray(f.columns) ? f.columns : [];
          if (childFields.length === 0 && typeof f.options === "string") {
             try {
                const childMeta = await api.get<any>(`/api/v1/doc/meta/${encodeURIComponent(f.options)}`);
                childFields = childMeta?.fields || [];
             } catch (e) { console.error(`Child meta error for ${f.options}`, e); }
          }
          
          columns = await Promise.all(childFields.map(async (cf: any) => ({
            name: cf.name,
            label: cf.label || cf.name,
            type: cf.fieldtype?.toLowerCase() === "int" || cf.fieldtype?.toLowerCase() === "float" ? "number" : (cf.fieldtype?.toLowerCase() || cf.type?.toLowerCase() || "text"),
            required: !!cf.required,
            disabled: !!cf.readonly || !!cf.disabled,
            options: await resolveFieldOptions(cf)
          })));
        }

        return {
          name: f.name,
          label: f.label || f.name,
          type: type === "int" || type === "float" || type === "number" ? "number" : type,
          required: !!f.required,
          disabled: !!f.readonly || !!f.disabled,
          options,
          columns,
          fetch_from: f.fetch_from
        };
      }));
      setFields(resolved);
    };

    if (meta) resolveMetadata();
  }, [meta, doctype]);

  if (metaLoading || recordsLoading) return <div className="module-page"><LoadingState message={`Loading ${title || doctype}...`} /></div>;
  if (metaError) return <div className="module-page"><ErrorState message={`Failed to load metadata for ${doctype}`} onRetry={refetchMeta} /></div>;

  
  // Decide which columns to show in the list view (first 4 text/string/email fields)
  const listColumns = fields.filter(f => f.name !== "id" && f.name !== "tenant_id" && f.type !== "table").slice(0, 5);

  const filteredRecords = (Array.isArray(records) ? records : []).filter(r => 
    Object.values(r).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()))
  );


  const handleSave = async (data: any) => {
    try {
      if (editingRecord?.id) {
        await api.put(`/api/v1/doc/${doctype}/${editingRecord.id}`, data);
        toast.success(`${doctype} updated`);
      } else {
        await api.post(`/api/v1/doc/${doctype}`, data);
        toast.success(`${doctype} created`);
      }
      refetchRecords();
    } catch (e: any) {
      toast.error(e.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm(`Are you sure you want to delete this ${doctype}?`)) {
      try {
        await api.delete(`/api/v1/doc/${doctype}/${id}`);
        toast.success(`${doctype} deleted`);
        refetchRecords();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete");
      }
    }
  };

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title || doctype}</h1>
          <p className="text-sm text-muted-foreground">{description || `Manage ${doctype} records dynamically.`}</p>
        </div>
        <Button onClick={() => { setEditingRecord(null); setModalOpen(true); }} className="gap-2">
          <PlusCircle className="h-4 w-4" /> Add {doctype}
        </Button>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={`Search ${doctype}...`}
                className="pl-9 h-9 bg-slate-50 border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {listColumns.map(c => <th key={c.name}>{c.label}</th>)}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={listColumns.length + 1} className="py-8 text-center text-muted-foreground">
                      No records found. Click "Add {doctype}" to create one.
                    </td>
                  </tr>
                ) : filteredRecords.map((record: any) => (
                  <tr key={record.id}>
                    {listColumns.map(c => (
                      <td key={c.name} className="truncate max-w-[200px]">
                        {c.name === "status" ? <Badge variant="outline">{record[c.name]}</Badge> : record[c.name]}
                      </td>
                    ))}
                    <td className="text-right flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary" onClick={() => { setEditingRecord(record); setModalOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-destructive" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <RecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingRecord?.id ? `Edit ${doctype} #${editingRecord.id}` : `New ${doctype}`}
        fields={fields}
        initialData={editingRecord}
        onChangeData={onRecordChange}
        onSubmit={handleSave}
        doctype={doctype}
      />

    </div>
  );
}
