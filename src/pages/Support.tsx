import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  consumer_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_from_bot: boolean;
  is_read: boolean;
  created_at: string;
}

const AUTO_RESPONSES = [
  'Obrigado pela sua mensagem! Um atendente responderá em breve.',
  'Sua solicitação foi registrada. O horário de atendimento é das 8h às 18h.',
  'Para emergências, ligue para o número de suporte do condomínio.',
];

export default function Support() {
  const { user, isSindico } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [supportPhone, setSupportPhone] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      
      const channel = supabase
        .channel(`messages-${selectedConversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('condo_settings').select('support_phone').limit(1).single();
    if (data) setSupportPhone(data.support_phone || '');
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
  };

  const createConversation = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .insert({ consumer_id: user.id, subject: 'Novo atendimento' })
        .select()
        .single();

      if (error) throw error;
      
      setConversations(prev => [data, ...prev]);
      setSelectedConversation(data);

      // Auto response
      await supabase.from('support_messages').insert({
        conversation_id: data.id,
        sender_id: user.id,
        message: AUTO_RESPONSES[0],
        is_from_bot: true,
      });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        message: newMessage.trim(),
        is_from_bot: false,
      });

      if (error) throw error;
      setNewMessage('');

      // If consumer, send auto-response after 2 seconds
      if (!isSindico) {
        setTimeout(async () => {
          const randomResponse = AUTO_RESPONSES[Math.floor(Math.random() * AUTO_RESPONSES.length)];
          await supabase.from('support_messages').insert({
            conversation_id: selectedConversation.id,
            sender_id: user.id,
            message: randomResponse,
            is_from_bot: true,
          });
        }, 2000);
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl gradient-sunset p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">Apoio ao Cliente</h1>
            <p className="text-white/80 text-sm">Chat com a administração do condomínio</p>
          </div>
          {supportPhone && (
            <a href={`tel:${supportPhone}`} className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 hover:bg-white/30 transition-colors">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">{supportPhone}</span>
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr] h-[calc(100vh-280px)]">
        {/* Conversations list */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Conversas</CardTitle>
              <Button size="sm" onClick={createConversation} className="gap-1">
                <Plus className="h-3 w-3" /> Nova
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma conversa</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors",
                      selectedConversation?.id === conv.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{conv.subject}</span>
                      <Badge variant={conv.status === 'aberto' ? 'default' : 'secondary'} className="text-[10px] px-1.5">
                        {conv.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(conv.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedConversation(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-base">{selectedConversation.subject}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Iniciada em {formatDate(selectedConversation.created_at)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id && !msg.is_from_bot;
                      const isBot = msg.is_from_bot;
                      
                      return (
                        <div key={msg.id} className={cn("flex", isMe && !isBot ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                            isBot
                              ? "bg-gradient-to-br from-slate-100 to-slate-50 text-slate-700 border"
                              : isMe
                                ? "bg-gradient-to-br from-primary to-primary/90 text-white"
                                : "bg-gradient-to-br from-sky-100 to-sky-50 text-sky-900 border"
                          )}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {isBot ? (
                                <Bot className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                              <span className="text-[10px] font-medium opacity-70">
                                {isBot ? 'Assistente' : isMe ? 'Você' : 'Atendente'}
                              </span>
                            </div>
                            <p>{msg.message}</p>
                            <span className="text-[10px] opacity-60 mt-1 block text-right">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-3 border-t flex-shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sending || !newMessage.trim()} size="icon">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
