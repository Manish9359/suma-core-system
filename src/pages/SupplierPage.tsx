import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone, MapPin, Tag, Edit, Trash2 } from "lucide-react";
import { supplierApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";

export default function SupplierPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const { data: suppliers, isLoading, error, refetch } = useApiQuery(["purchasing", "suppliers"], supplierApi.getSuppliers);

  const fields: RecordField[] = [
    { name: "id", label: "Supplier ID", type: "text", required: true, disabled: !!editingSupplier },
    { name: "name", label: "Supplier Name", type: "text", required: true },
    { name: "contact", label: "Contact Details", type: "text" },
    { name: "address", label: "Address", type: "text" },
    { name: "category", label: "Category", type: "select", options: ["Electronic Parts", "Services", "IT Hardware", "Logistics"] }
  ];

  if (isLoading) return <div className="module-page"><LoadingState /></div>;
  if (error) return <div className="module-page"><ErrorState onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage raw material and service vendors</p>
        </div>
        <Button onClick={() => { setEditingSupplier(null); setModalOpen(true); }} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20">
          <Plus className="h-4 w-4" /> New Supplier
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search suppliers..." className="pl-9 h-9" />
        </div>
      </div>

      {!suppliers || suppliers.length === 0 ? <EmptyState title="No suppliers yet" /> : (
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <table className="data-table">
              <thead className="bg-muted/50">
                <tr><th>ID</th><th>Name</th><th>Contact</th><th>Address</th><th>Category</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-accent/5 transition-colors">
                    <td className="font-mono text-xs">{s.id}</td>
                    <td className="font-semibold">{s.name}</td>
                    <td className="text-sm text-muted-foreground">{s.contact}</td>
                    <td className="text-sm">
                      <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{s.address || "—"}</div>
                    </td>
                    <td><span className="status-badge bg-primary/10 text-primary">{s.category}</span></td>
                    <td className="text-right flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingSupplier(s); setModalOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                        if (confirm(`Delete ${s.name}?`)) { await supplierApi.deleteSupplier(s.id); refetch(); }
                      }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <RecordModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingSupplier(null); }}
        title={editingSupplier ? "Edit Supplier" : "Create New Supplier"}
        fields={fields}
        initialData={editingSupplier || {}}
        onSubmit={async (data) => {
          if (editingSupplier) await supplierApi.updateSupplier(editingSupplier.id, data);
          else await supplierApi.createSupplier(data);
          refetch();
          setModalOpen(false);
        }}
      />
    </div>
  );
}
