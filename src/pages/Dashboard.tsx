import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lamp, AlertTriangle, Wrench, CheckCircle2, Activity,
  Clock, Zap, ArrowRight, Plus, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

interface PoleStats { total: number; funcionando: number; com_falha: number; em_manutencao: number; }

interface Maintenance {
  id: string; description: string; failure_type: string; status: string;
  priority: string; created_at: string; poles: { code: string } | null;
}

interface LightingTypeCount { name: string; value: number; color: string; }

const statusColors: Record<string, string> = {
  aberto: 'bg-amber-500/15 text-amber-700 border-amber-300',
  em_andamento: 'bg-sky-500/15 text-sky-700 border-sky-300',
  concluido: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
};

const priorityColors: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-600',
  media: 'bg-amber-100 text-amber-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
};

const failureTypeLabels: Record<string, string> = {
  lampada_queimada: 'Lâmpada queimada', curto_circuito: 'Curto-circuito',
  oscilacao: 'Oscilação', fiacao_danificada: 'Fiação danificada',
  poste_danificado: 'Poste danificado', outros: 'Outros',
};

const lightingTypeColors: Record<string, string> = {
  led: 'hsl(24, 95%, 53%)', solar: 'hsl(45, 93%, 47%)',
  fluorescente: 'hsl(142, 70%, 45%)', halogenea: 'hsl(200, 80%, 50%)',
  vapor_sodio: 'hsl(280, 60%, 50%)', vapor_mercurio: 'hsl(215, 20%, 65%)',
};

const lightingTypeLabels: Record<string, string> = {
  led: 'LED', solar: 'Solar', fluorescente: 'Fluorescente',
  halogenea: 'Halógena', vapor_sodio: 'Vapor Sódio', vapor_mercurio: 'Vapor Mercúrio',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [poleStats, setPoleStats] = useState<PoleStats>({ total: 0, funcionando: 0, com_falha: 0, em_manutencao: 0 });
  const [recentMaintenances, setRecentMaintenances] = useState<Maintenance[]>([]);
  const [lightingTypes, setLightingTypes] = useState<LightingTypeCount[]>([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: poles } = await supabase.from('poles').select('status, lighting_type');
      if (poles) {
        setPoleStats({
          total: poles.length,
          funcionando: poles.filter(p => p.status === 'funcionando').length,
          com_falha: poles.filter(p => p.status === 'com_falha').length,
          em_manutencao: poles.filter(p => p.status === 'em_manutencao').length,
        });
        const typeCounts: Record<string, number> = {};
        poles.forEach(p => { typeCounts[p.lighting_type] = (typeCounts[p.lighting_type] || 0) + 1; });
        setLightingTypes(Object.entries(typeCounts).map(([type, count]) => ({
          name: lightingTypeLabels[type] || type, value: count,
          color: lightingTypeColors[type] || 'hsl(215, 20%, 65%)',
        })));
      }
      const { data: maintenances } = await supabase
        .from('maintenances').select('id, description, failure_type, status, priority, created_at, poles(code)')
        .order('created_at', { ascending: false }).limit(5);
      if (maintenances) setRecentMaintenances(maintenances as Maintenance[]);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const formatTimeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days} dia${days > 1 ? 's' : ''}`;
    return new Date(d).toLocaleDateString('pt-BR');
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const statsData = [
    { title: 'Total de Postes', value: poleStats.total, icon: Lamp, iconBg: 'bg-violet-500/15', iconColor: 'text-violet-600', gradient: 'from-violet-500/5', borderColor: 'border-l-violet-500' },
    { title: 'Funcionando', value: poleStats.funcionando, icon: CheckCircle2, iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-600', gradient: 'from-emerald-500/5', borderColor: 'border-l-emerald-500' },
    { title: 'Com Falhas', value: poleStats.com_falha, icon: AlertTriangle, iconBg: 'bg-amber-500/15', iconColor: 'text-amber-600', gradient: 'from-amber-500/5', borderColor: 'border-l-amber-500' },
    { title: 'Em Manutenção', value: poleStats.em_manutencao, icon: Wrench, iconBg: 'bg-sky-500/15', iconColor: 'text-sky-600', gradient: 'from-sky-500/5', borderColor: 'border-l-sky-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl gradient-sunset p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20"><Activity className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">Dashboard</h1>
              <p className="text-white/80">Visão geral do sistema de monitoramento de postes</p>
            </div>
          </div>
          <Button onClick={() => navigate('/manutencoes')} variant="secondary" className="gap-2 shadow-md">
            <Plus className="h-4 w-4" />Nova Ocorrência
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title} className={cn("border-l-4 hover:shadow-md transition-shadow", stat.borderColor)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={cn("p-2.5 rounded-xl", stat.iconBg)}><stat.icon className={cn("h-5 w-5", stat.iconColor)} /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Resumo do Sistema</CardTitle>
            <CardDescription>Status geral da iluminação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-300/30">
                <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><span className="font-medium text-emerald-700">Operacionais</span></div>
                <p className="text-3xl font-bold text-emerald-700">{poleStats.funcionando}</p>
                <p className="text-sm text-emerald-600/70">postes funcionando</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-300/30">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><span className="font-medium text-amber-700">Com Problemas</span></div>
                <p className="text-3xl font-bold text-amber-700">{poleStats.com_falha}</p>
                <p className="text-sm text-amber-600/70">necessitam reparo</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-300/30">
                <div className="flex items-center gap-2 mb-2"><Wrench className="h-5 w-5 text-sky-600" /><span className="font-medium text-sky-700">Em Serviço</span></div>
                <p className="text-3xl font-bold text-sky-700">{poleStats.em_manutencao}</p>
                <p className="text-sm text-sky-600/70">em manutenção</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Tipos de Iluminação</CardTitle>
            <CardDescription>Distribuição por tecnologia</CardDescription>
          </CardHeader>
          <CardContent>
            {lightingTypes.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={lightingTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {lightingTypes.map((entry, i) => (<Cell key={`cell-${i}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {lightingTypes.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <span className="text-sm font-medium ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground"><p>Nenhum poste cadastrado</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Maintenances */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Últimas Ocorrências</CardTitle>
              <CardDescription>Chamados de manutenção recentes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/manutencoes')} className="gap-2">Ver todas<ArrowRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentMaintenances.length > 0 ? (
            <div className="space-y-3">
              {recentMaintenances.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-white font-semibold text-xs shadow-sm">{item.poles?.code || 'N/A'}</div>
                    <div>
                      <p className="font-medium">{failureTypeLabels[item.failure_type] || item.failure_type}</p>
                      <p className="text-sm text-muted-foreground">{formatTimeAgo(item.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(priorityColors[item.priority])}>{item.priority}</Badge>
                    <Badge variant="outline" className={cn(statusColors[item.status])}>{item.status?.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma ocorrência registrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
