import {
  LayoutDashboard, Users, ShoppingCart, Package, Truck,
  Calculator, UserCog, Headphones, Shield, Wrench,
  BarChart3, Settings, LogOut, Hammer
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const coreModules = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const salesModules = [
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Purchasing", url: "/purchasing", icon: Truck },
];

const operationsModules = [
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Manufacturing", url: "/manufacturing", icon: Hammer },
  { title: "Projects", url: "/projects", icon: BarChart3 },
];

const financeModules = [
  { title: "Accounting", url: "/accounting", icon: Calculator },
  { title: "HR & Payroll", url: "/hr", icon: UserCog },
];

const supportModules = [
  { title: "Service Desk", url: "/service", icon: Headphones },
  { title: "AMC", url: "/amc", icon: Shield },
  { title: "Installations", url: "/installations", icon: Wrench },
];

const analyticsModules = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const groups = [
  { label: "Core", items: coreModules },
  { label: "Sales & Buying", items: salesModules },
  { label: "Operations", items: operationsModules },
  { label: "Finance & HR", items: financeModules },
  { label: "Support", items: supportModules },
  { label: "Analytics", items: analyticsModules },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarHeader className="p-4 border-b border-border bg-card mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
            <span className="text-primary-foreground text-lg font-black tracking-tighter">S</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <h2 className="text-sm font-extrabold text-foreground leading-tight">SumaERP</h2>
              <p className="text-[10px] text-muted-foreground font-medium">Enterprise Suite</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 mb-1 px-3">
              {!collapsed && group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="group flex items-center px-3 py-1.5 text-[13px] font-medium text-muted-foreground rounded-lg hover:bg-accent/50 transition-all hover:text-foreground"
                        activeClassName="bg-primary/10 text-primary font-bold shadow-sm"
                      >
                        <item.icon className="mr-3 h-4 w-4 text-muted-foreground/70 group-hover:text-primary group-[.active]:text-primary transition-colors" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border bg-card">
        {/* User info */}
        {user && !collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.name || user.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className="text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg" activeClassName="text-primary font-bold bg-primary/10">
                <Settings className="mr-3 h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-[13px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-3 mt-1"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Logout"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
