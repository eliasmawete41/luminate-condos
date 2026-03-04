import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import Poles from "./pages/Poles";
import Maintenances from "./pages/Maintenances";
import Units from "./pages/Units";
import Users from "./pages/Users";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Devices from "./pages/Devices";
import Support from "./pages/Support";
import Evaluations from "./pages/Evaluations";
import MapPage from "./pages/MapPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AppLayout />}>
              {/* Admin routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/postes" element={<Poles />} />
              <Route path="/manutencoes" element={<Maintenances />} />
              <Route path="/unidades" element={<Units />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/notificacoes" element={<Notifications />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="/dispositivos" element={<Devices />} />
              <Route path="/mapa" element={<MapPage />} />
              
              {/* Technician routes */}
              <Route path="/tecnico" element={<TechnicianDashboard />} />
              
              {/* Consumer routes */}
              <Route path="/inicio" element={<ConsumerDashboard />} />
              <Route path="/suporte" element={<Support />} />
              <Route path="/avaliacoes" element={<Evaluations />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
