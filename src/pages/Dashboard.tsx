import {
  DollarSign, FileText, Package, TrendingUp,
  ArrowUpRight, ArrowDownRight, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, EmptyState } from "@/components/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))"
];

const kpiConfig = [
  { key: "total_sales", label: "Total Sales", changeKey: "sales_change", icon: DollarSign },
  { key: "monthly_revenue", label: "Revenue", changeKey: "revenue_change", icon: TrendingUp },
  { key: "pending_invoices", label: "Pending Invoices", changeKey: "invoices_change", icon: FileText },
  { key: "low_stock_items", label: "Low Stock", changeKey: "stock_change", icon: Package },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: kpis, isLoading: kpisLoading, error: kpisError, refetch: refetchKpis } = useApiQuery(["dashboard", "kpis"], dashboardApi.getKpis);
  const { data: salesChart, isLoading: salesLoading } = useApiQuery(["dashboard", "sales"], dashboardApi.getSalesChart);
  const { data: revenueChart, isLoading: revenueLoading } = useApiQuery(["dashboard", "revenue"], dashboardApi.getRevenueChart);
  const { data: inventoryChart } = useApiQuery(["dashboard", "inventory"], dashboardApi.getInventoryChart);
  const { data: activities } = useApiQuery(["dashboard", "activity"], dashboardApi.getRecentActivity);

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user?.name || "Admin"}</p>
        </div>
      </div>

      {kpisLoading ? (
        <LoadingState message="Loading dashboard..." />
      ) : kpisError ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground">Backend Not Connected</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Start your Python backend server to see live data. Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">cd backend && python run.py</code>
              </p>
            </div>
            <Button variant="outline" onClick={() => refetchKpis()}>Try Again</Button>
          </CardContent>
        </Card>
      ) : kpis ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiConfig.map((cfg) => {
              const value = (kpis as any)[cfg.key];
              const change = (kpis as any)[cfg.changeKey] || "";
              const isUp = change.startsWith("+");
              return (
                <Card key={cfg.key} className="border-none shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <cfg.icon className="h-5 w-5 text-primary" />
                      </div>
                      {change && (
                        <span className={`text-[11px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                          isUp ? "bg-emerald-50 text-emerald-700" : "bg-destructive/10 text-destructive"
                        }`}>
                          {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {change}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-extrabold tracking-tight">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{cfg.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Monthly Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? <LoadingState /> : salesChart && salesChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={salesChart}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Sales"]} />
                      <Bar dataKey="value" fill="url(#salesGrad)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="No sales data yet" />}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? <LoadingState /> : revenueChart && revenueChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={revenueChart}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="No revenue data yet" />}
              </CardContent>
            </Card>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryChart && inventoryChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={inventoryChart} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {inventoryChart.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="No inventory data" />}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activities && activities.length > 0 ? (
                  <div className="space-y-0.5">
                    {activities.slice(0, 8).map((a, i) => (
                      <div key={i} className="flex items-start justify-between gap-4 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          <p className="text-sm">{a.text}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState title="No recent activity" description="Activity will appear here as you use the system" />}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
