import { useState, useEffect } from 'react';
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
  CheckCheck,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Notificacao = Database['public']['Tables']['notifications']['Row'];

// Configuração por tipo de notificação
const configTipo: Record<string, { icone: React.ElementType; cor: string; corFundo: string }> = {
  success: { icone: CheckCircle2, cor: 'text-green-600', corFundo: 'bg-green-500/10' },
  warning: { icone: AlertTriangle, cor: 'text-amber-600', corFundo: 'bg-amber-500/10' },
  error: { icone: AlertTriangle, cor: 'text-red-600', corFundo: 'bg-red-500/10' },
  info: { icone: Info, cor: 'text-blue-600', corFundo: 'bg-blue-500/10' },
};

export default function Notificacoes() {
  const { toast } = useToast();
  const { user: usuario } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (usuario) {
      buscarNotificacoes();
    }
  }, [usuario]);

  // Buscar notificações do banco
  const buscarNotificacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotificacoes(data || []);
    } catch (erro) {
      console.error('Erro ao buscar notificações:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const contagemNaoLidas = notificacoes.filter(n => !n.is_read).length;

  // Marcar notificação como lida
  const marcarComoLida = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setNotificacoes(anterior => 
        anterior.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (erro) {
      console.error('Erro ao marcar como lida:', erro);
    }
  };

  // Marcar todas como lidas
  const marcarTodasComoLidas = async () => {
    try {
      const idsNaoLidas = notificacoes.filter(n => !n.is_read).map(n => n.id);
      
      if (idsNaoLidas.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', idsNaoLidas);

      if (error) throw error;

      setNotificacoes(anterior => anterior.map(n => ({ ...n, is_read: true })));
      toast({ title: 'Todas as notificações marcadas como lidas' });
    } catch (erro) {
      console.error('Erro ao marcar todas como lidas:', erro);
    }
  };

  // Formatar data relativa
  const formatarData = (dataString: string | null) => {
    if (!dataString) return '';
    const data = new Date(dataString);
    const agora = new Date();
    const diferenca = agora.getTime() - data.getTime();
    const horas = Math.floor(diferenca / (1000 * 60 * 60));
    const dias = Math.floor(horas / 24);

    if (horas < 1) return 'Agora mesmo';
    if (horas < 24) return `${horas}h atrás`;
    if (dias < 7) return `${dias} dia${dias > 1 ? 's' : ''} atrás`;
    return data.toLocaleDateString('pt-BR');
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Notificações</h1>
          <p className="text-muted-foreground">
            Alertas e avisos do sistema de monitoramento
          </p>
        </div>
        {contagemNaoLidas > 0 && (
          <Button variant="outline" onClick={marcarTodasComoLidas} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{notificacoes.length}</p>
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
                <p className="text-2xl font-bold">{contagemNaoLidas}</p>
              </div>
              <Badge className="bg-primary">{contagemNaoLidas}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas</p>
                <p className="text-2xl font-bold">
                  {notificacoes.filter(n => n.type === 'warning' || n.type === 'error').length}
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
                  {notificacoes.filter(n => n.related_pole_id || n.related_maintenance_id).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-600">
                <Wrench className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Todas as Notificações
          </CardTitle>
          <CardDescription>
            {notificacoes.length} notificações no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificacoes.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map((notificacao) => {
                const config = configTipo[notificacao.type || 'info'];
                const Icone = config.icone;

                return (
                  <div
                    key={notificacao.id}
                    className={cn(
                      "flex gap-4 p-4 rounded-lg border transition-colors cursor-pointer",
                      notificacao.is_read 
                        ? "bg-card hover:bg-muted/50" 
                        : "bg-accent/30 border-primary/20"
                    )}
                    onClick={() => marcarComoLida(notificacao.id)}
                  >
                    <div className={cn("p-2 rounded-full shrink-0 h-fit", config.corFundo)}>
                      <Icone className={cn("h-5 w-5", config.cor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={cn(
                            "font-medium",
                            !notificacao.is_read && "text-foreground"
                          )}>
                            {notificacao.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notificacao.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!notificacao.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatarData(notificacao.created_at)}
                        </span>
                        {notificacao.related_pole_id && (
                          <Badge variant="outline" className="text-xs">
                            <Lamp className="mr-1 h-3 w-3" />
                            Poste relacionado
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
