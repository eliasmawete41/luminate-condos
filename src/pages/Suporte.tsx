import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/cartao';
import { Button } from '@/components/ui/botao';
import { Input } from '@/components/ui/entrada';
import { Badge } from '@/components/ui/etiqueta';
import { ScrollArea } from '@/components/ui/area-rolagem';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  ArrowLeft, 
  Loader2,
  Phone,
  Bot,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { useToast } from '@/hooks/use-toast';

// Interface de conversa
interface Conversa {
  id: string;
  consumer_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  consumer_name?: string;
  consumer_email?: string;
}

// Interface de mensagem
interface Mensagem {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_from_bot: boolean;
  is_read: boolean;
  created_at: string;
}

// Mensagem de boas-vindas
const BOAS_VINDAS_BOT = 'Olá! 👋 Sou o assistente virtual do PosteGuard. Deixe a sua mensagem e a administração responderá em breve. Enquanto isso, posso ajudar com algumas dúvidas comuns.';

// Respostas automáticas exibidas enquanto o admin não responde
const RESPOSTAS_AUTOMATICAS = [
  'Recebemos a sua mensagem ✅. Um atendente humano será notificado.',
  'O horário de atendimento da administração é das 8h às 18h, de segunda a sábado.',
  'Dica: se a avaria estiver visível, registe também uma ocorrência na secção "Notificações" para acelerar o atendimento.',
  'Para emergências (poste caído, fios expostos ou risco elétrico), por favor ligue diretamente para o número de suporte.',
  'Ainda estamos a alertar a administração. Pode adicionar fotos ou mais detalhes à sua mensagem que ajudem a resolver mais rápido.',
];

export default function Suporte() {
  const { user: usuario, isAdmin } = useAuth();
  const { toast } = useToast();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [telefoneSuporte, setTelefoneSuporte] = useState('');
  const refFimMensagens = useRef<HTMLDivElement>(null);
  const indiceBotRef = useRef(0);

  useEffect(() => {
    buscarConversas();
    buscarConfiguracoes();
  }, []);

  useEffect(() => {
    if (conversaSelecionada) {
      buscarMensagens(conversaSelecionada.id);
      
      // Inscrição em tempo real para novas mensagens
      const canal = supabase
        .channel(`mensagens-${conversaSelecionada.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversaSelecionada.id}`,
        }, (payload) => {
          setMensagens(anterior => [...anterior, payload.new as Mensagem]);
        })
        .subscribe();

      return () => { supabase.removeChannel(canal); };
    }
  }, [conversaSelecionada]);

  useEffect(() => {
    refFimMensagens.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Buscar configurações do condomínio
  const buscarConfiguracoes = async () => {
    const { data } = await supabase.from('condo_settings').select('support_phone').limit(1).single();
    if (data) setTelefoneSuporte(data.support_phone || '');
  };

  // Buscar conversas
  const buscarConversas = async () => {
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const lista = data || [];
      // Buscar perfis em paralelo para mostrar o nome do morador
      const ids = [...new Set(lista.map((c) => c.consumer_id))];
      let perfis: Record<string, { full_name: string; email: string }> = {};
      if (ids.length > 0) {
        const { data: perfilData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ids);
        perfis = (perfilData || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, email: p.email };
          return acc;
        }, {} as Record<string, { full_name: string; email: string }>);
      }
      setConversas(
        lista.map((c) => ({
          ...c,
          consumer_name: perfis[c.consumer_id]?.full_name,
          consumer_email: perfis[c.consumer_id]?.email,
        })),
      );
    } catch (erro) {
      console.error('Erro:', erro);
    } finally {
      setCarregando(false);
    }
  };

  // Buscar mensagens de uma conversa
  const buscarMensagens = async (idConversa: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', idConversa)
      .order('created_at', { ascending: true });

    setMensagens(data || []);
  };

  // Criar nova conversa
  const criarConversa = async () => {
    if (!usuario) return;

    try {
      // Buscar nome do morador para usar como assunto da conversa
      const { data: perfil } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', usuario.id)
        .single();

      const nomeMorador = perfil?.full_name || 'Morador';

      const { data, error } = await supabase
        .from('support_conversations')
        .insert({ consumer_id: usuario.id, subject: nomeMorador })
        .select()
        .single();

      if (error) throw error;

      const novaConversa = {
        ...data,
        consumer_name: nomeMorador,
        consumer_email: perfil?.email,
      };
      setConversas(anterior => [novaConversa, ...anterior]);
      setConversaSelecionada(novaConversa);
      indiceBotRef.current = 0;

      // Resposta automática
      await supabase.from('support_messages').insert({
        conversation_id: data.id,
        sender_id: usuario.id,
        message: BOAS_VINDAS_BOT,
        is_from_bot: true,
      });
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    }
  };

  // Enviar mensagem
  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada || !usuario) return;

    setEnviando(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        conversation_id: conversaSelecionada.id,
        sender_id: usuario.id,
        message: novaMensagem.trim(),
        is_from_bot: false,
      });

      if (error) throw error;
      setNovaMensagem('');

      // Se for morador e o admin ainda não respondeu, enviar mensagem programada
      if (!isAdmin) {
        const adminRespondeu = mensagens.some(
          (m) => !m.is_from_bot && m.sender_id !== usuario.id,
        );
        if (!adminRespondeu) {
          const resposta = RESPOSTAS_AUTOMATICAS[indiceBotRef.current % RESPOSTAS_AUTOMATICAS.length];
          indiceBotRef.current += 1;
          setTimeout(async () => {
            await supabase.from('support_messages').insert({
              conversation_id: conversaSelecionada.id,
              sender_id: usuario.id,
              message: resposta,
              is_from_bot: true,
            });
          }, 1500);
        }
      }
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  // Formatar hora
  const formatarHora = (dataString: string) => {
    return new Date(dataString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Formatar data curta
  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="rounded-xl gradient-sunset p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">Apoio ao Cliente</h1>
            <p className="text-white/80 text-sm">Chat com a administração do condomínio</p>
          </div>
          {telefoneSuporte && (
            <a href={`tel:${telefoneSuporte}`} className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 hover:bg-white/30 transition-colors">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">{telefoneSuporte}</span>
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr] h-[calc(100vh-280px)]">
        {/* Lista de conversas */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Conversas</CardTitle>
              <Button size="sm" onClick={criarConversa} className="gap-1">
                <Plus className="h-3 w-3" /> Nova
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-2">
            {conversas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma conversa</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversas.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setConversaSelecionada(conv)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors",
                      conversaSelecionada?.id === conv.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {conv.consumer_name || conv.subject}
                      </span>
                      <Badge variant={conv.status === 'aberto' ? 'default' : 'secondary'} className="text-[10px] px-1.5">
                        {conv.status}
                      </Badge>
                    </div>
                    {isAdmin && conv.consumer_email && (
                      <p className="text-[11px] text-muted-foreground truncate">{conv.consumer_email}</p>
                    )}
                    <span className="text-xs text-muted-foreground">{formatarData(conv.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Área do chat */}
        <Card className="flex flex-col">
          {conversaSelecionada ? (
            <>
              <CardHeader className="pb-3 border-b flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setConversaSelecionada(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-base">
                      {conversaSelecionada.consumer_name || conversaSelecionada.subject}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {isAdmin && conversaSelecionada.consumer_email
                        ? `${conversaSelecionada.consumer_email} • `
                        : ''}
                      Iniciada em {formatarData(conversaSelecionada.created_at)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {mensagens.map((msg) => {
                      const souEu = msg.sender_id === usuario?.id && !msg.is_from_bot;
                      const ehBot = msg.is_from_bot;
                      
                      return (
                        <div key={msg.id} className={cn("flex", souEu && !ehBot ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                            ehBot
                              ? "bg-gradient-to-br from-slate-100 to-slate-50 text-slate-700 border"
                              : souEu
                                ? "bg-gradient-to-br from-primary to-primary/90 text-white"
                                : "bg-gradient-to-br from-sky-100 to-sky-50 text-sky-900 border"
                          )}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {ehBot ? (
                                <Bot className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                              <span className="text-[10px] font-medium opacity-70">
                                {ehBot ? 'Assistente' : souEu ? 'Você' : 'Atendente'}
                              </span>
                            </div>
                            <p>{msg.message}</p>
                            <span className="text-[10px] opacity-60 mt-1 block text-right">
                              {formatarHora(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={refFimMensagens} />
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-3 border-t flex-shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); enviarMensagem(); }} className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={enviando || !novaMensagem.trim()} size="icon">
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Selecione uma conversa ou inicie uma nova</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
