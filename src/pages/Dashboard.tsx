import {
  DollarSign, FileText, Package, Shield, Headphones, TrendingUp,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/LoadingState";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))"
];

const kpiConfig = [
  { key: "total_sales", label: "Total Sales", changeKey: "sales_change", icon: DollarSign, gradient: "from-emerald-500/10 to-emerald-500/5" },
  { key: "monthly_revenue", label: "Monthly Revenue", changeKey: "revenue_change", icon: TrendingUp, gradient: "from-blue-500/10 to-blue-500/5" },
  { key: "pending_invoices", label: "Pending Invoices", changeKey: "invoices_change", icon: FileText, gradient: "from-amber-500/10 to-amber-500/5" },
  { key: "low_stock_items", label: "Low Stock Items", changeKey: "stock_change", icon: Package, gradient: "from-red-500/10 to-red-500/5" },
  { key: "active_amcs", label: "Active AMCs", changeKey: "amc_change", icon: Shield, gradient: "from-violet-500/10 to-violet-500/5" },
  { key: "open_tickets", label: "Open Tickets", changeKey: "tickets_change", icon: Headphones, gradient: "from-cyan-500/10 to-cyan-500/5" },
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
          <p className="text-sm text-muted-foreground">Welcome back, {user?.name || "Admin"}. Here's your business overview.</p>
        </div>
      </div>

      {/* KPI Cards */}
      {kpisLoading ? (
        <LoadingState message="Loading dashboard..." />
      ) : kpisError ? (
        <ErrorState message="Cannot connect to backend" onRetry={refetchKpis} />
      ) : kpis ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiConfig.map((cfg) => {
              const value = (kpis as any)[cfg.key];
              const change = (kpis as any)[cfg.changeKey] || "";
              const isUp = change.startsWith("+") || change.startsWith("-") && cfg.key === "low_stock_items";
              return (
                <div key={cfg.key} className={`kpi-card bg-gradient-to-br ${cfg.gradient} border-none shadow-sm hover:shadow-lg transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-xl bg-card/80 flex items-center justify-center shadow-sm">
                      <cfg.icon className="h-4 w-4 text-accent" />
                    </div>
                    <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${isUp ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {change}
                    </span>
                  </div>
                  <p className="text-2xl font-extrabold tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{cfg.label}</p>
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-base font-semibold">Monthly Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? <LoadingState /> : salesChart && salesChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={salesChart}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Sales"]} />
                      <Bar dataKey="value" fill="url(#salesGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="No sales data yet" />}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="pb-2 bg-gradient-to-r from-accent/5 to-transparent">
                <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueLoading ? <LoadingState /> : revenueChart && revenueChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueChart}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#revenueGradient)" />
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
                <CardTitle className="text-base font-semibold">Inventory by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryChart && inventoryChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={inventoryChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
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
                  <div className="space-y-1">
                    {activities.map((a, i) => (
                      <div key={i} className="flex items-start justify-between gap-4 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-accent shrink-0 mt-1.5" />
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
