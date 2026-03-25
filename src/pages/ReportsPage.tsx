import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, Package, Users, DollarSign, Eye, X } from "lucide-react";
import { reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const reports = [
  { name: "Sales Report", description: "Monthly sales summary with trends", icon: DollarSign, type: "sales", gradient: "from-emerald-500/10 to-emerald-500/5" },
  { name: "Purchase Report", description: "Supplier procurement and PO summary", icon: FileText, type: "purchase", gradient: "from-amber-500/10 to-amber-500/5" },
  { name: "Inventory Report", description: "Stock levels and movement analysis", icon: Package, type: "inventory", gradient: "from-blue-500/10 to-blue-500/5" },
  { name: "Employee Report", description: "Staff directory and payroll summary", icon: Users, type: "hr", gradient: "from-violet-500/10 to-violet-500/5" },
  { name: "Financial Summary", description: "P&L, balance sheet, and net profit", icon: BarChart3, type: "financial", gradient: "from-cyan-500/10 to-cyan-500/5" },
];

export default function ReportsPage() {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const handleView = async (type: string) => {
    try {
      const data = await reportsApi.view(type);
      setReportData(data);
      setActiveReport(type);
    } catch {
      toast({ title: "Failed to load report", variant: "destructive" });
    }
  };

  const handleDownload = async (type: string, format: string) => {
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
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Monitor business performance and export financial records</p>
        </div>
      </div>

      {!reportData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <Card key={r.name} className={`hover:shadow-lg transition-all duration-300 border-none shadow-md bg-gradient-to-br ${r.gradient}`}>
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
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-card" onClick={() => handleView(r.type)}>
                    <Eye className="h-3 w-3" />Preview
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-card" onClick={() => handleDownload(r.type, "pdf")}>
                    <Download className="h-3 w-3" />PDF
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-card" onClick={() => handleDownload(r.type, "excel")}>
                    <Download className="h-3 w-3" />Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold capitalize">{activeReport?.replace("_", " ")} Preview</h2>
            <Button variant="ghost" size="sm" onClick={() => setReportData(null)}><X className="h-4 w-4 mr-2" />Close</Button>
          </div>
          <Card className="border-none shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {Object.keys(reportData[0] || {}).map(k => (
                    <TableHead key={k}>{k}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, i) => (
                  <TableRow key={i}>
                    {Object.values(row).map((v: any, j) => (
                      <TableCell key={j} className={typeof v === 'number' ? 'font-mono' : ''}>
                        {typeof v === 'number' ? v.toLocaleString() : v}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
