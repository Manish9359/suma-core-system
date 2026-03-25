import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Hammer, Settings, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ManufacturingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: boms, isLoading, error, refetch } = useApiQuery(["manufacturing", "bom"], () => api.get<any[]>("/api/manufacturing/bom"));

  const fields: RecordField[] = [
    { name: "item_code", label: "Finished Good Item", type: "text", required: true },
    { name: "qty", label: "Quantity", type: "number", required: true },
    { name: "total_cost", label: "Total Cost (₹)", type: "number" }
  ];

  if (isLoading) return <div className="module-page"><LoadingState /></div>;
  if (error) return <div className="module-page"><ErrorState onRetry={refetch} /></div>;

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manufacturing</h1>
          <p className="text-sm text-muted-foreground">Manage Bill of Materials (BOM) and production orders</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/20">
          <Plus className="h-4 w-4" /> New BOM
        </Button>
      </div>

      <Tabs defaultValue="bom" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="bom" className="gap-2 data-[state=active]:bg-background"><Settings className="h-4 w-4" />Bill of Materials</TabsTrigger>
          <TabsTrigger value="workorders" className="gap-2 data-[state=active]:bg-background"><Hammer className="h-4 w-4" />Work Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="bom" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search BOMs..." className="pl-9 h-9" />
            </div>
          </div>

          {!boms || boms.length === 0 ? <EmptyState title="No BOMs found" description="Create a Bill of Materials to start production planning." /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boms.map((b) => (
                <Card key={b.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <ClipboardList className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{b.item_code}</h3>
                        <p className="text-xs text-muted-foreground">Standard BOM</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between text-sm">
                      <span className="text-muted-foreground">Qty: {b.qty}</span>
                      <span className="font-bold">₹{b.total_cost?.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="workorders">
           <EmptyState title="No active work orders" description="Production orders will appear here once initiated." />
        </TabsContent>
      </Tabs>

      <RecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Create New BOM"
        fields={fields}
        onSubmit={async (data) => {
          await api.post("/api/manufacturing/bom", data);
          refetch();
        }}
      />
    </div>
  );
}
