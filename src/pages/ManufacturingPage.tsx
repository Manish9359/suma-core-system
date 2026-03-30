import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Hammer, Settings, ClipboardList } from "lucide-react";
import { api, inventoryApi, docApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { RecordModal, RecordField } from "@/components/RecordModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function ManufacturingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [produceModalOpen, setProduceModalOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<string | null>(null);
  
  const { data: boms, isLoading, error, refetch } = useApiQuery(["manufacturing", "bom"], () => docApi.list<any>("BOM"));
  const { data: products } = useApiQuery(["inventory", "products"], inventoryApi.getProducts);

  const productOptions = products?.map((p: any) => ({ label: `${p.name} (₹${p.cost})`, value: p.sku })) || [];

  const bomFields: RecordField[] = [
    { name: "item_code", label: "Finished Good Items (To Produce)", type: "select", options: productOptions, required: true },
    { name: "qty", label: "Base Quantity", type: "number", required: true },
    { 
      name: "items", label: "Raw Materials Consumed", type: "table", required: true, 
      columns: [
        { name: "item_code", label: "Raw Material", type: "select", options: productOptions },
        { name: "qty", label: "Qty per Base", type: "number" },
      ]
    }
  ];

  const produceFields: RecordField[] = [
    { name: "qty", label: "Quantity to Produce", type: "number", required: true }
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
                <Card key={b.id} className="border-none shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <ClipboardList className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{b.item_code}</h3>
                          <p className="text-xs text-muted-foreground">{b.id}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-accent/5">Base Qty: {b.qty}</Badge>
                    </div>
                    <div className="mt-5 flex justify-between items-center text-sm">
                      <span className="font-bold text-lg">₹{b.total_cost?.toLocaleString() || "0.00"}</span>
                      <Button variant="secondary" size="sm" onClick={() => { setSelectedBom(b.id); setProduceModalOpen(true); }} className="gap-1.5 h-8">
                        <Hammer className="h-3.5 w-3.5" /> Produce
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="workorders">
           <EmptyState title="No active work orders" description="Production orders trace their history back to BOMs." />
        </TabsContent>
      </Tabs>

      <RecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Create New Bill of Materials"
        fields={bomFields}
        onSubmit={async (data) => {
          await api.post("/api/v1/manufacturing/bom", data);
          refetch();
        }}
      />

      <RecordModal
        open={produceModalOpen}
        onOpenChange={setProduceModalOpen}
        title="Execute Work Order"
        fields={produceFields}
        onSubmit={async (data) => {
          await api.post("/api/v1/manufacturing/produce", { bom_id: selectedBom, qty: data.qty });
          refetch();
        }}
      />
    </div>
  );
}
