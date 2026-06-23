import { SidebarProvider, SidebarTrigger } from '@/components/ui/barra-lateral';
import { AppSidebar } from './BarraLateral';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/botao';
import { useTema } from '@/contexts/ContextoTema';

export function AppLayout() {
  const { user, loading, isAdmin, roles } = useAuth();
  const location = useLocation();
  const { tema, alternarTema } = useTema();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const ehTecnico = roles.includes('manutencao') && !isAdmin;
  const ehConsumidor = !isAdmin && !ehTecnico && (roles.includes('morador') || roles.length === 0);

  const rotasSomenteAdmin = ['/dashboard', '/postes', '/manutencoes', '/unidades', '/usuarios', '/dispositivos', '/monitor-esp32', '/notificacoes', '/configuracoes', '/mapa'];
  const rotasSomenteConsumidor = ['/inicio', '/avaliacoes'];
  const rotasTecnico = ['/tecnico'];

  if (ehConsumidor && rotasSomenteAdmin.includes(location.pathname)) return <Navigate to="/inicio" replace />;
  if (ehConsumidor && rotasTecnico.includes(location.pathname)) return <Navigate to="/inicio" replace />;
  if (ehTecnico && rotasSomenteAdmin.includes(location.pathname)) return <Navigate to="/tecnico" replace />;
  if (ehTecnico && rotasSomenteConsumidor.includes(location.pathname)) return <Navigate to="/tecnico" replace />;
  if (!ehConsumidor && !ehTecnico && rotasSomenteConsumidor.includes(location.pathname)) return <Navigate to="/dashboard" replace />;

  if (location.pathname === '/') {
    if (ehConsumidor) return <Navigate to="/inicio" replace />;
    if (ehTecnico) return <Navigate to="/tecnico" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Cabeçalho com efeito vidro */}
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 md:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={alternarTema}
                aria-label="Alternar tema"
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                {tema === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              {!ehConsumidor && (
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-accent">
                  <Bell className="h-5 w-5" />
                </Button>
              )}
            </div>
          </header>
          {/* Área de conteúdo principal */}
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}