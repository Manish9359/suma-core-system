import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search, ChevronRight, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { api, systemApi } from "@/lib/api";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { data: notifications, refetch } = useApiQuery(["system", "notifications"], () => systemApi.getNotifications());
  const unreadCount = notifications?.length || 0;
  
  // Breadcrumb generator
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#f8f9fa]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b bg-white px-4 shrink-0 shadow-none">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-slate-400 hover:text-slate-600 h-8 w-8" title="Toggle Sidebar" />
              
              {/* Breadcrumbs - ERPNext Style */}
              <nav className="flex items-center text-[13px] text-slate-500 font-medium">
                <Link to="/" className="hover:text-primary flex items-center gap-1.5 px-1">
                  <Home className="h-3.5 w-3.5" />
                  <span>Home</span>
                </Link>
                {pathnames.map((name, index) => {
                  const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
                  const isLast = index === pathnames.length - 1;
                  return (
                    <div key={name} className="flex items-center">
                      <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-slate-300" />
                      <Link 
                        to={routeTo} 
                        className={`capitalize hover:text-primary ${isLast ? "text-slate-900 font-bold" : ""}`}
                      >
                        {name.replace(/-/g, " ")}
                      </Link>
                    </div>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:flex items-center group">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search (Ctrl + G)"
                  className="pl-8 w-64 h-8 bg-slate-100 border-none text-xs focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
              <div className="flex items-center gap-2 pl-2 border-l ml-2">
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-bold text-slate-900 leading-none">{user?.name || "Admin User"}</p>
                </div>
                <div className="w-7 h-7 rounded-md bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                  {user?.name?.substring(0, 2) || "AD"}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-[#f4f5f6]">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
