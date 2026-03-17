import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, Package, Users, DollarSign } from "lucide-react";

const reports = [
  { name: "Sales Report", description: "Monthly sales summary with trends", icon: DollarSign },
  { name: "Inventory Report", description: "Stock levels and movement analysis", icon: Package },
  { name: "Technician Performance", description: "Service tickets and resolution times", icon: Users },
  { name: "AMC Status Report", description: "Active contracts and renewal schedule", icon: FileText },
  { name: "Financial Summary", description: "P&L, balance sheet, and cash flow", icon: BarChart3 },
];

export default function ReportsPage() {
  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and export business reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.name} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <r.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{r.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{r.description}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Download className="h-3 w-3" />PDF</Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Download className="h-3 w-3" />Excel</Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"><Download className="h-3 w-3" />CSV</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
