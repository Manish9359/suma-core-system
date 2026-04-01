import GenericModulePage from "./GenericModulePage";

export default function SalesOrderPage() {
  return (
    <GenericModulePage 
      doctype="Sales Order" 
      title="Sales Orders" 
      description="Track committed sales and release items for production or dispatch."
      onRecordChange={(data) => {
        if(!data.items) return data;
        const items = data.items.map((it: any) => ({
          ...it,
          amount: Number(it.qty || 0) * Number(it.rate || 0)
        }));
        const total = items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
        return { ...data, items, total };
      }}
    />
  );
}
