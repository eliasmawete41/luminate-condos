import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Phone, 
  Star, 
  Lamp,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  HeadphonesIcon,
  ThumbsUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function ConsumerDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supportPhone, setSupportPhone] = useState('');
  const [condoName, setCondoName] = useState('');
  const [poleStats, setPoleStats] = useState({ total: 0, funcionando: 0, com_falha: 0 });
  const [openConversations, setOpenConversations] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, polesRes, convRes] = await Promise.all([
        supabase.from('condo_settings').select('*').limit(1).single(),
        supabase.from('poles').select('status'),
        supabase.from('support_conversations').select('id', { count: 'exact' }).eq('status', 'aberto'),
      ]);

      if (settingsRes.data) {
        setSupportPhone(settingsRes.data.support_phone || '');
        setCondoName(settingsRes.data.condo_name || 'Condomínio');
      }

      if (polesRes.data) {
        setPoleStats({
          total: polesRes.data.length,
          funcionando: polesRes.data.filter((p: any) => p.status === 'funcionando').length,
          com_falha: polesRes.data.filter((p: any) => p.status === 'com_falha').length,
        });
      }

      setOpenConversations(convRes.count || 0);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="rounded-xl gradient-sunset p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">
          Olá, {profile?.full_name?.split(' ')[0] || 'Consumidor'}! 👋
        </h1>
        <p className="text-white/80 mt-1">
          Bem-vindo ao portal do {condoName}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/50 group bg-gradient-to-br from-orange-500/5 to-amber-500/5"
          onClick={() => navigate('/suporte')}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 group-hover:from-orange-500/30 group-hover:to-amber-500/30 transition-colors">
                <MessageCircle className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Chat de Suporte</h3>
                <p className="text-sm text-muted-foreground">Fale com a administração</p>
              </div>
              {openConversations > 0 && (
                <Badge className="bg-orange-500">{openConversations} aberto(s)</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-emerald-500/50 group bg-gradient-to-br from-emerald-500/5 to-teal-500/5"
          onClick={() => navigate('/avaliacoes')}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 group-hover:from-emerald-500/30 group-hover:to-teal-500/30 transition-colors">
                <Star className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Avaliar</h3>
                <p className="text-sm text-muted-foreground">Avalie o sistema e atendimento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 bg-gradient-to-br from-sky-500/5 to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-500/20">
                <Phone className="h-8 w-8 text-sky-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Telefone</h3>
                <p className="text-sm text-muted-foreground">Apoio ao Cliente</p>
              </div>
              <a href={`tel:${supportPhone}`} className="text-lg font-bold text-sky-600 hover:underline">
                {supportPhone || 'Não configurado'}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status dos Postes - Apenas informativo */}
      <Card className="bg-gradient-to-br from-slate-900/5 to-slate-800/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lamp className="h-5 w-5 text-primary" />
            Status da Iluminação
          </CardTitle>
          <CardDescription>Visão geral do sistema de iluminação do condomínio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-200/30">
              <div className="flex items-center gap-2 mb-2">
                <Lamp className="h-5 w-5 text-violet-600" />
                <span className="font-medium text-violet-700">Total de Postes</span>
              </div>
              <p className="text-3xl font-bold text-violet-700">{poleStats.total}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-700">Funcionando</span>
              </div>
              <p className="text-3xl font-bold text-emerald-700">{poleStats.funcionando}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-200/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-700">Com Problemas</span>
              </div>
              <p className="text-3xl font-bold text-amber-700">{poleStats.com_falha}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info do Condomínio */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
            <HeadphonesIcon className="h-10 w-10 text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold">Precisa de ajuda?</h3>
              <p className="text-sm text-muted-foreground">
                Use o chat de suporte ou ligue para o número acima. Estamos aqui para ajudar!
              </p>
            </div>
            <Button onClick={() => navigate('/suporte')} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Iniciar Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
