import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, Package, Users, DollarSign } from "lucide-react";
import { reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const reports = [
  { name: "Sales Report", description: "Monthly sales summary with trends", icon: DollarSign, type: "sales", gradient: "from-emerald-500/10 to-emerald-500/5" },
  { name: "Inventory Report", description: "Stock levels and movement analysis", icon: Package, type: "inventory", gradient: "from-blue-500/10 to-blue-500/5" },
  { name: "Technician Performance", description: "Service tickets and resolution times", icon: Users, type: "technician", gradient: "from-violet-500/10 to-violet-500/5" },
  { name: "AMC Status Report", description: "Active contracts and renewal schedule", icon: FileText, type: "amc", gradient: "from-amber-500/10 to-amber-500/5" },
  { name: "Financial Summary", description: "P&L, balance sheet, and cash flow", icon: BarChart3, type: "financial", gradient: "from-cyan-500/10 to-cyan-500/5" },
];

export default function ReportsPage() {
  const { toast } = useToast();

  const handleDownload = async (type: string, format: "pdf" | "excel" | "csv") => {
    try {
      const blob = await reportsApi.generate(type, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_report.${format === "excel" ? "xlsx" : format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Report downloaded", description: `${type} report exported as ${format.toUpperCase()}` });
    } catch {
      toast({ title: "Export failed", description: "Make sure your Python backend is running", variant: "destructive" });
    }
  };

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
          <Card key={r.name} className={`hover:shadow-lg transition-all duration-300 cursor-pointer border-none shadow-md bg-gradient-to-br ${r.gradient}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-card/80 flex items-center justify-center shadow-sm">
                  <r.icon className="h-5 w-5 text-accent" />
                </div>
                <CardTitle className="text-base">{r.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{r.description}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleDownload(r.type, "pdf")}>
                  <Download className="h-3 w-3" />PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleDownload(r.type, "excel")}>
                  <Download className="h-3 w-3" />Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleDownload(r.type, "csv")}>
                  <Download className="h-3 w-3" />CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
