import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/ContextoAutenticacao";
import { AppLayout } from "@/components/layout/LayoutPrincipal";

import Auth from "./pages/Autenticacao";
import Dashboard from "./pages/Painel";
import ConsumerDashboard from "./pages/PainelMorador";
import TechnicianDashboard from "./pages/PainelTecnico";
import Poles from "./pages/Postes";
import Maintenances from "./pages/Manutencoes";
import Units from "./pages/Unidades";
import Users from "./pages/Usuarios";
import Notifications from "./pages/Notificacoes";
import Settings from "./pages/Configuracoes";
import Devices from "./pages/Dispositivos";
import Support from "./pages/Suporte";
import Evaluations from "./pages/Avaliacoes";
import MapPage from "./pages/Mapa";
import NotFound from "./pages/NaoEncontrado";

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
              {/* Rotas de administrador */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/postes" element={<Poles />} />
              <Route path="/manutencoes" element={<Maintenances />} />
              <Route path="/unidades" element={<Units />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/notificacoes" element={<Notifications />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="/dispositivos" element={<Devices />} />
              <Route path="/mapa" element={<MapPage />} />
              
              {/* Rotas do técnico de manutenção */}
              <Route path="/tecnico" element={<TechnicianDashboard />} />
              
              {/* Rotas do morador (consumidor) */}
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
