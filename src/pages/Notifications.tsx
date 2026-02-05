import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Wrench,
  Lamp,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mockNotifications = [
  { 
    id: '1', 
    title: 'Poste P-003 com falha',
    message: 'Foi registrada uma falha no poste P-003 localizado no Jardim Bloco A. Uma lâmpada queimada foi reportada.',
    type: 'warning',
    isRead: false,
    createdAt: '2024-01-20T10:30:00',
    relatedPole: 'P-003'
  },
  { 
    id: '2', 
    title: 'Manutenção concluída',
    message: 'A manutenção do poste P-008 foi concluída com sucesso. A lâmpada foi substituída.',
    type: 'success',
    isRead: false,
    createdAt: '2024-01-19T16:45:00',
    relatedPole: 'P-008'
  },
  { 
    id: '3', 
    title: 'Vida útil próxima do fim',
    message: 'A lâmpada do poste P-012 está com 85% da vida útil consumida. Recomendamos agendar uma manutenção preventiva.',
    type: 'info',
    isRead: true,
    createdAt: '2024-01-18T09:00:00',
    relatedPole: 'P-012'
  },
  { 
    id: '4', 
    title: 'Novo chamado atribuído',
    message: 'Um novo chamado de manutenção foi atribuído a você. Poste P-004 com problema de oscilação.',
    type: 'info',
    isRead: true,
    createdAt: '2024-01-17T14:20:00',
    relatedPole: 'P-004'
  },
  { 
    id: '5', 
    title: 'Alerta crítico',
    message: 'O poste P-015 apresentou curto-circuito. Necessária intervenção imediata.',
    type: 'error',
    isRead: true,
    createdAt: '2024-01-16T22:15:00',
    relatedPole: 'P-015'
  },
];

const typeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  success: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  error: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-500/10' },
  info: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Agora mesmo';
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days} dia${days > 1 ? 's' : ''} atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Notificações</h1>
          <p className="text-muted-foreground">
            Alertas e avisos do sistema de monitoramento
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Não lidas</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
              <Badge className="bg-primary">{unreadCount}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'warning' || n.type === 'error').length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Manutenções</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.relatedPole).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-600">
                <Wrench className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Todas as Notificações
          </CardTitle>
          <CardDescription>
            {notifications.length} notificações no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const config = typeConfig[notification.type];
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-4 p-4 rounded-lg border transition-colors cursor-pointer",
                      notification.isRead 
                        ? "bg-card hover:bg-muted/50" 
                        : "bg-accent/30 border-primary/20"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className={cn("p-2 rounded-full shrink-0 h-fit", config.bgColor)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={cn(
                            "font-medium",
                            !notification.isRead && "text-foreground"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </span>
                        {notification.relatedPole && (
                          <Badge variant="outline" className="text-xs">
                            <Lamp className="mr-1 h-3 w-3" />
                            {notification.relatedPole}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
