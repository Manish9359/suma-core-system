import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search modules, records..."
                  className="pl-9 w-64 h-9 bg-muted/50 border-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">3</span>
              </Button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center text-xs font-semibold text-accent-foreground shadow-md">
                {user?.name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "SA"}
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
