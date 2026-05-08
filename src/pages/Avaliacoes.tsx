import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/cartao';
import { Button } from '@/components/ui/botao';
import { Textarea } from '@/components/ui/area-texto';
import { Label } from '@/components/ui/rotulo';
import { Badge } from '@/components/ui/etiqueta';
import { 
  Star, 
  ThumbsUp, 
  MessageSquare, 
  Loader2,
  CheckCircle2,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { useToast } from '@/hooks/use-toast';

// Interface de avaliação
interface Avaliacao {
  id: string;
  type: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export default function Avaliacoes() {
  const { user: usuario } = useAuth();
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Formulário
  const [notaSistema, setNotaSistema] = useState(0);
  const [notaAtendimento, setNotaAtendimento] = useState(0);
  const [comentarioSistema, setComentarioSistema] = useState('');
  const [comentarioAtendimento, setComentarioAtendimento] = useState('');

  useEffect(() => {
    buscarAvaliacoes();
  }, []);

  // Buscar avaliações do usuário
  const buscarAvaliacoes = async () => {
    try {
      const { data } = await supabase
        .from('evaluations')
        .select('*')
        .order('created_at', { ascending: false });
      setAvaliacoes(data || []);
    } catch (erro) {
      console.error('Erro:', erro);
    } finally {
      setCarregando(false);
    }
  };

  // Enviar avaliação
  const enviarAvaliacao = async (tipo: string, nota: number, comentario: string) => {
    if (!usuario || nota === 0) {
      toast({ title: 'Selecione uma avaliação', variant: 'destructive' });
      return;
    }

    setEnviando(true);
    try {
      const { error } = await supabase.from('evaluations').insert({
        user_id: usuario.id,
        type: tipo,
        rating: nota,
        comment: comentario || null,
      });

      if (error) throw error;

      toast({ title: 'Avaliação enviada!', description: 'Obrigado pelo seu feedback.' });
      
      if (tipo === 'sistema') {
        setNotaSistema(0);
        setComentarioSistema('');
      } else {
        setNotaAtendimento(0);
        setComentarioAtendimento('');
      }
      
      buscarAvaliacoes();
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  // Componente de classificação por estrelas
  const ClassificacaoEstrelas = ({ valor, aoAlterar }: { valor: number; aoAlterar: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((estrela) => (
        <button
          key={estrela}
          type="button"
          onClick={() => aoAlterar(estrela)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "h-8 w-8 transition-colors",
              estrela <= valor
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30 hover:text-amber-300"
            )}
          />
        </button>
      ))}
    </div>
  );

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
      <div className="rounded-xl gradient-sunset p-5 text-white shadow-lg">
        <h1 className="text-xl font-bold md:text-2xl">Avaliações</h1>
        <p className="text-white/80 text-sm">Sua opinião nos ajuda a melhorar</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Avaliar Sistema */}
        <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-200/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-violet-600" />
              Avaliar o Sistema
            </CardTitle>
            <CardDescription>Como você avalia a plataforma PosteGuard?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <ClassificacaoEstrelas valor={notaSistema} aoAlterar={setNotaSistema} />
            </div>
            <div>
              <Label>Comentário (opcional)</Label>
              <Textarea
                placeholder="Conte-nos o que você acha..."
                value={comentarioSistema}
                onChange={(e) => setComentarioSistema(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              onClick={() => enviarAvaliacao('sistema', notaSistema, comentarioSistema)}
              disabled={enviando || notaSistema === 0}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              Enviar Avaliação
            </Button>
          </CardContent>
        </Card>

        {/* Avaliar Atendimento */}
        <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-200/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Avaliar o Atendimento
            </CardTitle>
            <CardDescription>Como foi seu atendimento pelo suporte?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <ClassificacaoEstrelas valor={notaAtendimento} aoAlterar={setNotaAtendimento} />
            </div>
            <div>
              <Label>Comentário (opcional)</Label>
              <Textarea
                placeholder="Como podemos melhorar o atendimento..."
                value={comentarioAtendimento}
                onChange={(e) => setComentarioAtendimento(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              onClick={() => enviarAvaliacao('atendimento', notaAtendimento, comentarioAtendimento)}
              disabled={enviando || notaAtendimento === 0}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              Enviar Avaliação
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      {avaliacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Suas Avaliações Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {avaliacoes.map((avaliacao) => (
                <div key={avaliacao.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={avaliacao.type === 'sistema' ? 'border-violet-300 text-violet-600' : 'border-emerald-300 text-emerald-600'}>
                      {avaliacao.type === 'sistema' ? 'Sistema' : 'Atendimento'}
                    </Badge>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((estrela) => (
                        <Star
                          key={estrela}
                          className={cn(
                            "h-4 w-4",
                            estrela <= avaliacao.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                    {avaliacao.comment && (
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {avaliacao.comment}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
