import { useEffect, useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/botao';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/menu-suspenso';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notificacao {
  id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

export function SinoNotificacoes() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);

  const naoLidas = notifs.filter(n => !n.is_read).length;

  const buscar = async () => {
    if (!user) return;
    setCarregando(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifs((data || []) as Notificacao[]);
    setCarregando(false);
  };

  useEffect(() => {
    if (!user) return;
    buscar();
    const channel = supabase
      .channel('notif-' + user.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => buscar())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const marcarTodasLidas = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false);
    buscar();
  };

  const marcarLida = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <DropdownMenu open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-accent">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {naoLidas > 0 && (
            <button onClick={marcarTodasLidas} className="text-xs text-primary hover:underline">
              Marcar todas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {carregando ? (
            <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : notifs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem notificações</div>
          ) : (
            notifs.map(n => (
              <button
                key={n.id}
                onClick={() => marcarLida(n.id)}
                className={`w-full text-left p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    {n.created_at && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    )}
                  </div>
                  {n.is_read && <Check className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-1" />}
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}