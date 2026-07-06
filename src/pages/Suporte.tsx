import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/cartao';
import { Button } from '@/components/ui/botao';
import { Input } from '@/components/ui/entrada';
import { ScrollArea } from '@/components/ui/area-rolagem';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageCircle, Send, Plus, ArrowLeft, Loader2, Search, Check, CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { useToast } from '@/hooks/use-toast';

// Cliente sem tipos para tabelas ainda não presentes no ficheiro de tipos
const db = supabase as any;

interface Perfil {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Conversa {
  id: string;
  last_message: string | null;
  last_message_at: string | null;
  updated_at: string;
  outro: Perfil | null;
  nao_lidas: number;
}

interface Mensagem {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface Presenca {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  typing_in_conversation: string | null;
}

export default function Suporte() {
  const { user: usuario } = useAuth();
  const { toast } = useToast();

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Modal de nova conversa
  const [modalAberto, setModalAberto] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const [resultados, setResultados] = useState<Perfil[]>([]);
  const [pesquisando, setPesquisando] = useState(false);

  // Presenças
  const [presencas, setPresencas] = useState<Record<string, Presenca>>({});

  const refFim = useRef<HTMLDivElement>(null);
  const digitandoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============ Presença própria ============
  useEffect(() => {
    if (!usuario) return;
    const marcarOnline = async () => {
      await db.from('user_presence').upsert({
        user_id: usuario.id,
        is_online: true,
        last_seen: new Date().toISOString(),
        typing_in_conversation: null,
      });
    };
    marcarOnline();
    const intervalo = setInterval(marcarOnline, 30000);

    const marcarOffline = () => {
      db.from('user_presence').upsert({
        user_id: usuario.id,
        is_online: false,
        last_seen: new Date().toISOString(),
        typing_in_conversation: null,
      });
    };
    window.addEventListener('beforeunload', marcarOffline);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('beforeunload', marcarOffline);
      marcarOffline();
    };
  }, [usuario]);

  // ============ Carregar conversas ============
  const carregarConversas = useCallback(async () => {
    if (!usuario) return;
    try {
      const { data: minhas, error: erroMinhas } = await db
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', usuario.id);
      if (erroMinhas) throw erroMinhas;

      const ids: string[] = (minhas || []).map((r: any) => r.conversation_id);
      if (ids.length === 0) { setConversas([]); return; }

      const { data: convs, error: erroConvs } = await db
        .from('conversations')
        .select('*')
        .in('id', ids)
        .order('updated_at', { ascending: false });
      if (erroConvs) throw erroConvs;

      // participantes de todas
      const { data: parts } = await db
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', ids);

      const outrosIds = [...new Set(
        (parts || [])
          .filter((p: any) => p.user_id !== usuario.id)
          .map((p: any) => p.user_id)
      )] as string[];

      let perfis: Record<string, Perfil> = {};
      if (outrosIds.length > 0) {
        const { data: perfilData } = await db
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', outrosIds);
        perfis = (perfilData || []).reduce((acc: any, p: Perfil) => {
          acc[p.id] = p; return acc;
        }, {});
      }

      // não lidas
      const { data: naoLidasData } = await db
        .from('chat_messages')
        .select('conversation_id')
        .in('conversation_id', ids)
        .is('read_at', null)
        .neq('sender_id', usuario.id);
      const contagem: Record<string, number> = {};
      (naoLidasData || []).forEach((m: any) => {
        contagem[m.conversation_id] = (contagem[m.conversation_id] || 0) + 1;
      });

      const lista: Conversa[] = (convs || []).map((c: any) => {
        const outroId = (parts || []).find(
          (p: any) => p.conversation_id === c.id && p.user_id !== usuario.id
        )?.user_id;
        return {
          id: c.id,
          last_message: c.last_message,
          last_message_at: c.last_message_at,
          updated_at: c.updated_at,
          outro: outroId ? perfis[outroId] || null : null,
          nao_lidas: contagem[c.id] || 0,
        };
      });

      // ordenar por última mensagem
      lista.sort((a, b) => {
        const ta = a.last_message_at || a.updated_at;
        const tb = b.last_message_at || b.updated_at;
        return new Date(tb).getTime() - new Date(ta).getTime();
      });
      setConversas(lista);

      // buscar presenças dos outros
      if (outrosIds.length > 0) {
        const { data: pres } = await db
          .from('user_presence')
          .select('*')
          .in('user_id', outrosIds);
        const map: Record<string, Presenca> = {};
        (pres || []).forEach((p: Presenca) => { map[p.user_id] = p; });
        setPresencas(map);
      }
    } catch (erro: any) {
      console.error('Erro:', erro);
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  }, [usuario, toast]);

  useEffect(() => { carregarConversas(); }, [carregarConversas]);

  // ============ Realtime: mensagens novas em qualquer conversa minha ============
  useEffect(() => {
    if (!usuario) return;
    const canal = supabase
      .channel('chat-global')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
      }, () => { carregarConversas(); })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'user_presence',
      }, (payload: any) => {
        const p = payload.new as Presenca;
        setPresencas(prev => ({ ...prev, [p.user_id]: p }));
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [usuario, carregarConversas]);

  // ============ Carregar mensagens da conversa selecionada ============
  useEffect(() => {
    if (!conversaSelecionada || !usuario) return;

    const carregar = async () => {
      const { data } = await db
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversaSelecionada.id)
        .order('created_at', { ascending: true });
      setMensagens(data || []);

      // marcar como lidas
      await db
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversaSelecionada.id)
        .neq('sender_id', usuario.id)
        .is('read_at', null);
    };
    carregar();

    const canal = supabase
      .channel(`msg-${conversaSelecionada.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${conversaSelecionada.id}`,
      }, (payload: any) => {
        const nova = payload.new as Mensagem;
        setMensagens(anterior => {
          if (anterior.some(m => m.id === nova.id)) return anterior;
          return [...anterior, nova];
        });
        if (nova.sender_id !== usuario.id) {
          db.from('chat_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', nova.id);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${conversaSelecionada.id}`,
      }, (payload: any) => {
        const atual = payload.new as Mensagem;
        setMensagens(anterior => anterior.map(m => m.id === atual.id ? atual : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [conversaSelecionada, usuario]);

  useEffect(() => {
    refFim.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // ============ Pesquisa de utilizadores ============
  useEffect(() => {
    if (!modalAberto) return;
    const timeout = setTimeout(async () => {
      setPesquisando(true);
      try {
        let query = db
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .neq('id', usuario?.id || '')
          .limit(30);
        if (pesquisa.trim()) {
          const termo = `%${pesquisa.trim()}%`;
          query = query.or(`full_name.ilike.${termo},email.ilike.${termo}`);
        }
        const { data } = await query;
        setResultados(data || []);
      } finally {
        setPesquisando(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [pesquisa, modalAberto, usuario]);

  // ============ Iniciar conversa com utilizador ============
  const iniciarConversa = async (outro: Perfil) => {
    if (!usuario) return;
    try {
      // procurar conversa existente entre os dois
      const { data: minhas } = await db
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', usuario.id);
      const meusIds: string[] = (minhas || []).map((r: any) => r.conversation_id);

      let convId: string | null = null;
      if (meusIds.length > 0) {
        const { data: dele } = await db
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', outro.id)
          .in('conversation_id', meusIds);
        if (dele && dele.length > 0) convId = dele[0].conversation_id;
      }

      if (!convId) {
        convId = crypto.randomUUID();
        const { error } = await db
          .from('conversations')
          .insert({ id: convId });
        if (error) throw error;
        const { error: e2 } = await db
          .from('conversation_participants')
          .insert([
            { conversation_id: convId, user_id: usuario.id },
            { conversation_id: convId, user_id: outro.id },
          ]);
        if (e2) throw e2;
      }

      setModalAberto(false);
      setPesquisa('');
      await carregarConversas();
      const encontrada: Conversa = {
        id: convId!,
        last_message: null, last_message_at: null,
        updated_at: new Date().toISOString(),
        outro, nao_lidas: 0,
      };
      setConversaSelecionada(encontrada);
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    }
  };

  // ============ Digitando ============
  const aoDigitar = (valor: string) => {
    setNovaMensagem(valor);
    if (!usuario || !conversaSelecionada) return;
    db.from('user_presence').upsert({
      user_id: usuario.id, is_online: true,
      last_seen: new Date().toISOString(),
      typing_in_conversation: conversaSelecionada.id,
    });
    if (digitandoTimeoutRef.current) clearTimeout(digitandoTimeoutRef.current);
    digitandoTimeoutRef.current = setTimeout(() => {
      db.from('user_presence').upsert({
        user_id: usuario.id, is_online: true,
        last_seen: new Date().toISOString(),
        typing_in_conversation: null,
      });
    }, 2500);
  };

  // ============ Enviar ============
  const enviar = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada || !usuario) return;
    setEnviando(true);
    try {
      const { error } = await db.from('chat_messages').insert({
        conversation_id: conversaSelecionada.id,
        sender_id: usuario.id,
        message: novaMensagem.trim(),
      });
      if (error) throw error;
      setNovaMensagem('');
      db.from('user_presence').upsert({
        user_id: usuario.id, is_online: true,
        last_seen: new Date().toISOString(),
        typing_in_conversation: null,
      });
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  // ============ Helpers ============
  const formatarHora = (s: string) =>
    new Date(s).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  const formatarQuando = (s: string | null) => {
    if (!s) return '';
    const d = new Date(s);
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return formatarHora(s);
    const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  };

  const outroPresenca = conversaSelecionada?.outro
    ? presencas[conversaSelecionada.outro.id]
    : null;
  const outroDigitando = outroPresenca?.typing_in_conversation === conversaSelecionada?.id;

  const iniciais = (nome: string | undefined) =>
    (nome || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl gradient-sunset p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">Mensagens</h1>
            <p className="text-white/80 text-sm">Conversa em tempo real com moradores, técnicos e administração</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr] h-[calc(100vh-260px)]">
        {/* Lista */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-3 border-b flex-shrink-0 flex items-center gap-2">
            <span className="font-semibold text-sm flex-1">Conversas</span>
            <Button size="sm" onClick={() => setModalAberto(true)} className="gap-1">
              <Plus className="h-3 w-3" /> Nova
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {conversas.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground px-4">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma conversa ainda</p>
                <p className="text-xs mt-1">Clique em "Nova" para iniciar</p>
              </div>
            ) : (
              <div>
                {conversas.map((conv) => {
                  const pres = conv.outro ? presencas[conv.outro.id] : null;
                  const online = pres?.is_online;
                  const digitando = pres?.typing_in_conversation === conv.id;
                  const ativa = conversaSelecionada?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setConversaSelecionada(conv)}
                      className={cn(
                        "w-full text-left px-3 py-3 flex items-center gap-3 border-b transition-colors",
                        ativa ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={conv.outro?.avatar_url || undefined} />
                          <AvatarFallback className="gradient-primary text-primary-foreground">
                            {iniciais(conv.outro?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {online && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">
                            {conv.outro?.full_name || 'Utilizador'}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatarQuando(conv.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span className={cn(
                            "text-xs truncate",
                            digitando ? "text-primary italic" : "text-muted-foreground"
                          )}>
                            {digitando ? 'digitando...' : (conv.last_message || 'Sem mensagens')}
                          </span>
                          {conv.nao_lidas > 0 && (
                            <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                              {conv.nao_lidas}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat */}
        <Card className="flex flex-col overflow-hidden">
          {conversaSelecionada ? (
            <>
              <div className="p-3 border-b flex items-center gap-3 flex-shrink-0">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setConversaSelecionada(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conversaSelecionada.outro?.avatar_url || undefined} />
                  <AvatarFallback className="gradient-primary text-primary-foreground">
                    {iniciais(conversaSelecionada.outro?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {conversaSelecionada.outro?.full_name || 'Utilizador'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {outroDigitando
                      ? <span className="text-primary italic">digitando...</span>
                      : outroPresenca?.is_online
                        ? <span className="text-emerald-600">online</span>
                        : outroPresenca?.last_seen
                          ? `visto ${formatarQuando(outroPresenca.last_seen)}`
                          : 'offline'}
                  </div>
                </div>
              </div>

              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-2">
                    {mensagens.map((msg) => {
                      const souEu = msg.sender_id === usuario?.id;
                      return (
                        <div key={msg.id} className={cn("flex", souEu ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                            souEu
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          )}>
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            <div className={cn(
                              "flex items-center gap-1 justify-end mt-1 text-[10px]",
                              souEu ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              <span>{formatarHora(msg.created_at)}</span>
                              {souEu && (msg.read_at
                                ? <CheckCheck className="h-3 w-3 text-sky-300" />
                                : <Check className="h-3 w-3" />)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {outroDigitando && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl px-3 py-2 text-xs text-muted-foreground italic">
                          digitando...
                        </div>
                      </div>
                    )}
                    <div ref={refFim} />
                  </div>
                </ScrollArea>
              </CardContent>

              <div className="p-3 border-t flex-shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex gap-2">
                  <Input
                    placeholder="Digite uma mensagem..."
                    value={novaMensagem}
                    onChange={(e) => aoDigitar(e.target.value)}
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
                <p>Selecione uma conversa</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Nova Conversa */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Pesquisar por nome ou email..."
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-72">
              {pesquisando ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : resultados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum utilizador encontrado
                </p>
              ) : (
                <div className="space-y-1">
                  {resultados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => iniciarConversa(p)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="gradient-primary text-primary-foreground text-xs">
                          {iniciais(p.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
