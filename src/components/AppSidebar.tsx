import {
  LayoutDashboard, Users, ShoppingCart, Package, Truck, Building2,
  Calculator, UserCog, Headphones, Shield, Wrench,
  BarChart3, Settings, LogOut, Hammer, ShoppingBag, Box, CheckCircle, ChevronDown
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const modules = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Opportunities", url: "/opportunities", icon: BarChart3 },
  { title: "Leads Pipeline", url: "/crm", icon: UserCog },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Quotations", url: "/quotations", icon: Box },
  { title: "Sales Orders", url: "/sales/orders", icon: ShoppingBag },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Warehouses", url: "/warehouses", icon: Building2 },
  { title: "Purchasing", url: "/purchasing", icon: Truck },
  { title: "Suppliers", url: "/suppliers", icon: Building2 },
  { title: "Manufacturing", url: "/manufacturing", icon: Hammer },
  { title: "Accounting", url: "/accounting", icon: Calculator },
  { title: "HR & Payroll", url: "/hr", icon: UserCog },
  { title: "Assets", url: "/assets", icon: Box },
  { title: "Quality", url: "/quality", icon: CheckCircle },
  { title: "Projects", url: "/projects", icon: BarChart3 },
  { title: "Service Tickets", url: "/service", icon: Headphones },
  { title: "AMC", url: "/amc", icon: Shield },
  { title: "Installations", url: "/installations", icon: Wrench },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-[#f8f9fa]">
      <SidebarHeader className="p-4 border-b border-sidebar-border bg-white mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shadow-lg">
            <h1 className="text-white text-lg font-black tracking-tighter">S</h1>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-slate-900 leading-tight">SumaERP</h2>
              <p className="text-[10px] text-slate-400 font-medium">Enterprise Suite</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {modules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="group flex items-center px-3 py-1.5 text-[13px] font-medium text-slate-600 rounded-md hover:bg-slate-200 transition-all hover:text-slate-900"
                      activeClassName="bg-white shadow-sm ring-1 ring-slate-100 text-slate-900 font-bold"
                    >
                      <item.icon className="mr-3 h-4 w-4 text-slate-400 group-hover:text-blue-500 group-[.active]:text-blue-600" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-200 bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className="hover:bg-slate-100 text-[13px] font-medium text-slate-600" activeClassName="text-slate-900 font-bold bg-slate-100">
                <Settings className="mr-3 h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-[13px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 gap-3"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Logout"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
