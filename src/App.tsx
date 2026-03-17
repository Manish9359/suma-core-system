import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import CRMPage from "./pages/CRMPage";
import SalesPage from "./pages/SalesPage";
import InventoryPage from "./pages/InventoryPage";
import PurchasingPage from "./pages/PurchasingPage";
import AccountingPage from "./pages/AccountingPage";
import HRPage from "./pages/HRPage";
import ServicePage from "./pages/ServicePage";
import AMCPage from "./pages/AMCPage";
import InstallationsPage from "./pages/InstallationsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout><Dashboard /></AppLayout>} path="/" />
          <Route element={<AppLayout><CRMPage /></AppLayout>} path="/crm" />
          <Route element={<AppLayout><SalesPage /></AppLayout>} path="/sales" />
          <Route element={<AppLayout><InventoryPage /></AppLayout>} path="/inventory" />
          <Route element={<AppLayout><PurchasingPage /></AppLayout>} path="/purchasing" />
          <Route element={<AppLayout><AccountingPage /></AppLayout>} path="/accounting" />
          <Route element={<AppLayout><HRPage /></AppLayout>} path="/hr" />
          <Route element={<AppLayout><ServicePage /></AppLayout>} path="/service" />
          <Route element={<AppLayout><AMCPage /></AppLayout>} path="/amc" />
          <Route element={<AppLayout><InstallationsPage /></AppLayout>} path="/installations" />
          <Route element={<AppLayout><ReportsPage /></AppLayout>} path="/reports" />
          <Route element={<AppLayout><SettingsPage /></AppLayout>} path="/settings" />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
