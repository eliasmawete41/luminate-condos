import { SidebarProvider, SidebarTrigger } from '@/components/ui/barra-lateral';
import { AppSidebar } from './BarraLateral';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/botao';
import { useTema } from '@/contexts/ContextoTema';
import { SinoNotificacoes } from '@/components/SinoNotificacoes';
import { Clock, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/cartao';

export function AppLayout() {
  const { user, loading, isAdmin, roles, profile, signOut } = useAuth();
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

  // Bloqueia acesso a moradores pendentes/rejeitados
  if (profile && (profile.status === 'pendente' || profile.status === 'rejeitado')) {
    const pend = profile.status === 'pendente';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center ${pend ? 'bg-amber-500/20 text-amber-500' : 'bg-destructive/20 text-destructive'}`}>
            {pend ? <Clock className="h-8 w-8" /> : <ShieldAlert className="h-8 w-8" />}
          </div>
          <h1 className="text-2xl font-bold">
            {pend ? 'Conta em análise' : 'Cadastro rejeitado'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {pend
              ? 'O seu cadastro está aguardando aprovação da administração do condomínio. Você receberá acesso assim que for validado.'
              : profile.rejection_reason || 'O seu cadastro não foi aprovado pela administração.'}
          </p>
          <Button variant="outline" onClick={signOut} className="w-full">Sair</Button>
        </Card>
      </div>
    );
  }

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
              <SinoNotificacoes />
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