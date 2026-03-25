import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Building, Edit, Trash2 } from "lucide-react";
import { warehouseApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";

export default function WarehousePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const { data: warehouses, isLoading, error, refetch } = useApiQuery(["inventory", "warehouses"], warehouseApi.getWarehouses);

  const fields: RecordField[] = [
    { name: "id", label: "Warehouse ID", type: "text", required: true, disabled: !!editingWarehouse },
    { name: "name", label: "Warehouse Name", type: "text", required: true },
    { name: "location", label: "Location", type: "text" }
  ];

  if (isLoading) return <div className="module-page"><LoadingState /></div>;
  if (error) return <div className="module-page"><ErrorState onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouses</h1>
          <p className="text-sm text-muted-foreground">Manage storage locations and stock distribution</p>
        </div>
        <Button onClick={() => { setEditingWarehouse(null); setModalOpen(true); }} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20">
          <Plus className="h-4 w-4" /> Add Warehouse
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search warehouses..." className="pl-9 h-9" />
        </div>
      </div>

      {!warehouses || warehouses.length === 0 ? <EmptyState title="No warehouses found" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <Card key={w.id} className="border-none shadow-sm hover:shadow-md transition-shadow relative group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Building className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{w.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{w.id}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingWarehouse(w); setModalOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                      if (confirm(`Delete ${w.name}?`)) { await warehouseApi.deleteWarehouse(w.id); refetch(); }
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {w.location || "No location set"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RecordModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingWarehouse(null); }}
        title={editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
        fields={fields}
        initialData={editingWarehouse || {}}
        onSubmit={async (data) => {
          if (editingWarehouse) await warehouseApi.updateWarehouse(editingWarehouse.id, data);
          else await warehouseApi.createWarehouse(data);
          refetch();
          setModalOpen(false);
        }}
      />
    </div>
  );
}
