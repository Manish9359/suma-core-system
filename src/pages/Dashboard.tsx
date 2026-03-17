import {
  DollarSign, FileText, Package, Shield, Headphones, TrendingUp,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

const kpis = [
  { label: "Total Sales", value: "₹24,56,000", change: "+12.5%", up: true, icon: DollarSign },
  { label: "Monthly Revenue", value: "₹8,42,000", change: "+8.2%", up: true, icon: TrendingUp },
  { label: "Pending Invoices", value: "23", change: "+3", up: false, icon: FileText },
  { label: "Low Stock Items", value: "7", change: "-2", up: true, icon: Package },
  { label: "Active AMCs", value: "45", change: "+5", up: true, icon: Shield },
  { label: "Open Tickets", value: "12", change: "+4", up: false, icon: Headphones },
];

const salesData = [
  { month: "Jan", sales: 420000 }, { month: "Feb", sales: 380000 },
  { month: "Mar", sales: 510000 }, { month: "Apr", sales: 470000 },
  { month: "May", sales: 620000 }, { month: "Jun", sales: 580000 },
  { month: "Jul", sales: 690000 }, { month: "Aug", sales: 842000 },
];

const revenueData = [
  { month: "Jan", revenue: 350000 }, { month: "Feb", revenue: 310000 },
  { month: "Mar", revenue: 440000 }, { month: "Apr", revenue: 390000 },
  { month: "May", revenue: 520000 }, { month: "Jun", revenue: 480000 },
  { month: "Jul", revenue: 570000 }, { month: "Aug", revenue: 680000 },
];

const inventoryData = [
  { name: "CCTV Cameras", value: 340 },
  { name: "DVR/NVR", value: 120 },
  { name: "Cables & Wiring", value: 580 },
  { name: "Networking", value: 210 },
  { name: "Accessories", value: 150 },
];

const COLORS = [
  "hsl(215, 70%, 28%)", "hsl(174, 60%, 40%)", "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 40%)", "hsl(0, 72%, 51%)"
];

const recentActivities = [
  { text: "Invoice #INV-2024-089 created for Tech Solutions Ltd", time: "2 min ago" },
  { text: "New lead added: SecureHome Pvt Ltd", time: "15 min ago" },
  { text: "AMC renewal due for City Mall – 3 days", time: "1 hr ago" },
  { text: "Stock alert: IP Camera Model X42 below threshold", time: "2 hr ago" },
  { text: "Service ticket #TKT-156 resolved by Rahul", time: "3 hr ago" },
];

export default function Dashboard() {
  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, Admin. Here's your business overview.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
              <span className={`text-xs font-medium flex items-center gap-0.5 ${kpi.up ? 'text-success' : 'text-destructive'}`}>
                {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {kpi.change}
              </span>
            </div>
            <p className="text-xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Sales"]} />
                <Bar dataKey="sales" fill="hsl(215, 70%, 28%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(174, 60%, 40%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={inventoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {inventoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((a, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                  <p className="text-sm">{a.text}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
