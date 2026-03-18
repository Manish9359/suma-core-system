import {
  LayoutDashboard, Users, ShoppingCart, Package, Truck,
  Calculator, UserCog, Headphones, Shield, Wrench,
  BarChart3, Settings, LogOut
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
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Purchasing", url: "/purchasing", icon: Truck },
  { title: "Accounting", url: "/accounting", icon: Calculator },
  { title: "HR & Payroll", url: "/hr", icon: UserCog },
  { title: "Service Tickets", url: "/service", icon: Headphones },
  { title: "AMC", url: "/amc", icon: Shield },
  { title: "Installations", url: "/installations", icon: Wrench },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-accent-foreground">SumaERP</h2>
              <p className="text-[10px] text-sidebar-foreground">Surveillance Tech</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                <Settings className="mr-2 h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {!collapsed && user && (
          <div className="px-2 py-2 rounded-lg bg-sidebar-accent/30">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-foreground truncate">{user.role}</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Logout"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
