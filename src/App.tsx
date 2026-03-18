import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
      <Route path="/purchasing" element={<ProtectedRoute><PurchasingPage /></ProtectedRoute>} />
      <Route path="/accounting" element={<ProtectedRoute><AccountingPage /></ProtectedRoute>} />
      <Route path="/hr" element={<ProtectedRoute><HRPage /></ProtectedRoute>} />
      <Route path="/service" element={<ProtectedRoute><ServicePage /></ProtectedRoute>} />
      <Route path="/amc" element={<ProtectedRoute><AMCPage /></ProtectedRoute>} />
      <Route path="/installations" element={<ProtectedRoute><InstallationsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
