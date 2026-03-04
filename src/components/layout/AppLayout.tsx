import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AppLayout() {
  const { user, loading, isSindico, roles } = useAuth();
  const location = useLocation();

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect consumers away from admin pages
  const isConsumer = !isSindico && (roles.includes('morador') || roles.length === 0);
  const adminOnlyPaths = ['/dashboard', '/postes', '/manutencoes', '/unidades', '/usuarios', '/dispositivos', '/notificacoes', '/configuracoes', '/mapa'];
  const consumerOnlyPaths = ['/inicio', '/avaliacoes'];

  if (isConsumer && adminOnlyPaths.includes(location.pathname)) {
    return <Navigate to="/inicio" replace />;
  }

  if (!isConsumer && consumerOnlyPaths.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect root
  if (location.pathname === '/') {
    return <Navigate to={isConsumer ? '/inicio' : '/dashboard'} replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
            </div>
            
            {!isConsumer && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                </Button>
              </div>
            )}
          </header>
          
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-muted/30">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
