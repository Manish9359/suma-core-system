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

export default function GenericModulePage({ doctype, title, description }: { doctype: string, title?: string, description?: string }) {
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

  if (metaLoading || recordsLoading) return <div className="module-page"><LoadingState message={`Loading ${title || doctype}...`} /></div>;
  if (metaError) return <div className="module-page"><ErrorState message={`Failed to load metadata for ${doctype}`} onRetry={refetchMeta} /></div>;

  const fields: RecordField[] = meta?.fields || [];
  
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
        onSubmit={handleSave}
      />
    </div>
  );
}
