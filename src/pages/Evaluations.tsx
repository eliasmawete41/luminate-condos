import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Evaluation {
  id: string;
  type: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export default function Evaluations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form
  const [systemRating, setSystemRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [systemComment, setSystemComment] = useState('');
  const [serviceComment, setServiceComment] = useState('');

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const { data } = await supabase
        .from('evaluations')
        .select('*')
        .order('created_at', { ascending: false });
      setEvaluations(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitEvaluation = async (type: string, rating: number, comment: string) => {
    if (!user || rating === 0) {
      toast({ title: 'Selecione uma avaliação', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('evaluations').insert({
        user_id: user.id,
        type,
        rating,
        comment: comment || null,
      });

      if (error) throw error;

      toast({ title: 'Avaliação enviada!', description: 'Obrigado pelo seu feedback.' });
      
      if (type === 'sistema') {
        setSystemRating(0);
        setSystemComment('');
      } else {
        setServiceRating(0);
        setServiceComment('');
      }
      
      fetchEvaluations();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "h-8 w-8 transition-colors",
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30 hover:text-amber-300"
            )}
          />
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <StarRating value={systemRating} onChange={setSystemRating} />
            </div>
            <div>
              <Label>Comentário (opcional)</Label>
              <Textarea
                placeholder="Conte-nos o que você acha..."
                value={systemComment}
                onChange={(e) => setSystemComment(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              onClick={() => submitEvaluation('sistema', systemRating, systemComment)}
              disabled={sending || systemRating === 0}
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
              <StarRating value={serviceRating} onChange={setServiceRating} />
            </div>
            <div>
              <Label>Comentário (opcional)</Label>
              <Textarea
                placeholder="Como podemos melhorar o atendimento..."
                value={serviceComment}
                onChange={(e) => setServiceComment(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              onClick={() => submitEvaluation('atendimento', serviceRating, serviceComment)}
              disabled={sending || serviceRating === 0}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              Enviar Avaliação
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Suas Avaliações Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {evaluations.map((evaluation) => (
                <div key={evaluation.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={evaluation.type === 'sistema' ? 'border-violet-300 text-violet-600' : 'border-emerald-300 text-emerald-600'}>
                      {evaluation.type === 'sistema' ? 'Sistema' : 'Atendimento'}
                    </Badge>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            star <= evaluation.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                    {evaluation.comment && (
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {evaluation.comment}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(evaluation.created_at).toLocaleDateString('pt-BR')}
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
