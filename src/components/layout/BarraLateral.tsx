import { 
  LayoutDashboard, Lamp, Building2, Users, Wrench, Bell, Settings,
  LogOut, Zap, Cpu, MessageCircle, Star, HeadphonesIcon, MapPin,
  HardHat, History, UserCircle
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/barra-lateral';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/botao';

const adminMenuItems = [
  { title: 'Painel Principal', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Postes', url: '/postes', icon: Lamp },
  { title: 'Manutenções', url: '/manutencoes', icon: Wrench },
  { title: 'Relatórios', url: '/historico', icon: History },
  { title: 'Mapa', url: '/mapa', icon: MapPin },
];

const adminManagementItems = [
  { title: 'Usuários', url: '/usuarios', icon: Users },
  { title: 'Dispositivos', url: '/dispositivos', icon: Cpu },
  { title: 'Monitor ESP32', url: '/monitor-esp32', icon: Zap },
];

const adminUtilityItems = [
  { title: 'Suporte', url: '/suporte', icon: HeadphonesIcon },
  { title: 'Notificações', url: '/notificacoes', icon: Bell },
  { title: 'Meu Perfil', url: '/perfil', icon: UserCircle },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

const consumerMenuItems = [
  { title: 'Início', url: '/inicio', icon: LayoutDashboard },
  { title: 'Suporte', url: '/suporte', icon: MessageCircle },
  { title: 'Avaliações', url: '/avaliacoes', icon: Star },
  { title: 'Meu Perfil', url: '/perfil', icon: UserCircle },
];

const technicianMenuItems = [
  { title: 'Minhas Ordens', url: '/tecnico', icon: HardHat },
  { title: 'Suporte', url: '/suporte', icon: MessageCircle },
  { title: 'Meu Perfil', url: '/perfil', icon: UserCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, signOut, isAdmin, roles } = useAuth();
  const collapsed = state === 'collapsed';

  const isTechnician = roles.includes('manutencao') && !isAdmin;
  const isConsumer = !isAdmin && !isTechnician && (roles.includes('morador') || roles.length === 0);

  const isActive = (path: string) => location.pathname === path;

  const renderMenuItem = (item: { title: string; url: string; icon: React.ElementType }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} className={cn(collapsed && "!h-10 !w-10 !p-0 mx-auto")}>
        <NavLink 
          to={item.url} 
          className={cn(
            "flex items-center gap-3 rounded-xl transition-all duration-200",
            collapsed ? "justify-center !p-0 h-10 w-10" : "px-3 py-2.5",
            isActive(item.url) 
              ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20" 
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/[0.06]"
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="font-medium">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar-background">
      {/* Cabeçalho com logo */}
      <SidebarHeader className={cn("pb-6", collapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className={cn(
            "flex items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/25 shrink-0",
            collapsed ? "h-9 w-9" : "h-11 w-11"
          )}>
            <Zap className={cn(collapsed ? "h-5 w-5" : "h-6 w-6", "text-primary-foreground")} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">PosteGuard</span>
              <span className="text-[11px] text-sidebar-foreground/40 uppercase tracking-wider">
                {isConsumer ? 'Portal do Morador' : isTechnician ? 'Painel Técnico' : 'Monitoramento'}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={cn(collapsed ? "px-1.5" : "px-3")}>
        {isConsumer ? (
          <SidebarGroup>
            <SidebarGroupLabel className={cn("text-[11px] uppercase tracking-wider text-sidebar-foreground/30 mb-1", collapsed && "sr-only")}>Menu</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu className="space-y-1">{consumerMenuItems.map(renderMenuItem)}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        ) : isTechnician ? (
          <SidebarGroup>
            <SidebarGroupLabel className={cn("text-[11px] uppercase tracking-wider text-sidebar-foreground/30 mb-1", collapsed && "sr-only")}>Menu</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu className="space-y-1">{technicianMenuItems.map(renderMenuItem)}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className={cn("text-[11px] uppercase tracking-wider text-sidebar-foreground/30 mb-1", collapsed && "sr-only")}>Principal</SidebarGroupLabel>
              <SidebarGroupContent><SidebarMenu className="space-y-1">{adminMenuItems.map(renderMenuItem)}</SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className={cn("text-[11px] uppercase tracking-wider text-sidebar-foreground/30 mb-1", collapsed && "sr-only")}>Administração</SidebarGroupLabel>
              <SidebarGroupContent><SidebarMenu className="space-y-1">{adminManagementItems.map(renderMenuItem)}</SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className={cn("text-[11px] uppercase tracking-wider text-sidebar-foreground/30 mb-1", collapsed && "sr-only")}>Sistema</SidebarGroupLabel>
              <SidebarGroupContent><SidebarMenu className="space-y-1">{adminUtilityItems.map(renderMenuItem)}</SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Rodapé com perfil */}
      <SidebarFooter className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-center gap-3", collapsed && "flex-col gap-2")}>
          <Avatar className={cn("ring-2 ring-primary/20 shrink-0", collapsed ? "h-8 w-8" : "h-9 w-9")}>
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-semibold">
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || 'Usuário'}</p>
              <p className="text-xs text-sidebar-foreground/40 truncate">{profile?.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title="Sair"
            className={cn(
              "text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors",
              collapsed ? "h-8 w-8" : ""
            )}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}