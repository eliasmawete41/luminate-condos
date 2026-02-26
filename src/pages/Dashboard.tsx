import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lamp, 
  AlertTriangle, 
  Wrench, 
  CheckCircle2, 
  Activity,
  Clock,
  Zap,
  ArrowRight,
  Plus,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface PoleStats {
  total: number;
  funcionando: number;
  com_falha: number;
  em_manutencao: number;
}

interface Maintenance {
  id: string;
  description: string;
  failure_type: string;
  status: string;
  priority: string;
  created_at: string;
  poles: {
    code: string;
  } | null;
}

interface LightingTypeCount {
  name: string;
  value: number;
  color: string;
}

const statusColors: Record<string, string> = {
  aberto: 'bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-600',
  em_andamento: 'bg-sky-500/15 text-sky-700 border-sky-300 dark:text-sky-400 dark:border-sky-600',
  concluido: 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600',
};

const priorityColors: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  urgente: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

const failureTypeLabels: Record<string, string> = {
  lampada_queimada: 'Lâmpada queimada',
  curto_circuito: 'Curto-circuito',
  oscilacao: 'Oscilação',
  fiacao_danificada: 'Fiação danificada',
  poste_danificado: 'Poste danificado',
  outros: 'Outros',
};

const lightingTypeColors: Record<string, string> = {
  led: 'hsl(24, 95%, 53%)',
  solar: 'hsl(45, 93%, 47%)',
  fluorescente: 'hsl(142, 70%, 45%)',
  halogenea: 'hsl(200, 80%, 50%)',
  vapor_sodio: 'hsl(280, 60%, 50%)',
  vapor_mercurio: 'hsl(215, 20%, 65%)',
};

const lightingTypeLabels: Record<string, string> = {
  led: 'LED',
  solar: 'Solar',
  fluorescente: 'Fluorescente',
  halogenea: 'Halógena',
  vapor_sodio: 'Vapor Sódio',
  vapor_mercurio: 'Vapor Mercúrio',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [poleStats, setPoleStats] = useState<PoleStats>({ total: 0, funcionando: 0, com_falha: 0, em_manutencao: 0 });
  const [recentMaintenances, setRecentMaintenances] = useState<Maintenance[]>([]);
  const [lightingTypes, setLightingTypes] = useState<LightingTypeCount[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch pole stats
      const { data: poles } = await supabase.from('poles').select('status, lighting_type');
      
      if (poles) {
        const stats: PoleStats = {
          total: poles.length,
          funcionando: poles.filter(p => p.status === 'funcionando').length,
          com_falha: poles.filter(p => p.status === 'com_falha').length,
          em_manutencao: poles.filter(p => p.status === 'em_manutencao').length,
        };
        setPoleStats(stats);

        // Calculate lighting types distribution
        const typeCounts: Record<string, number> = {};
        poles.forEach(pole => {
          typeCounts[pole.lighting_type] = (typeCounts[pole.lighting_type] || 0) + 1;
        });

        const lightingData: LightingTypeCount[] = Object.entries(typeCounts).map(([type, count]) => ({
          name: lightingTypeLabels[type] || type,
          value: count,
          color: lightingTypeColors[type] || 'hsl(215, 20%, 65%)',
        }));
        setLightingTypes(lightingData);
      }

      // Fetch recent maintenances
      const { data: maintenances } = await supabase
        .from('maintenances')
        .select('id, description, failure_type, status, priority, created_at, poles(code)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (maintenances) {
        setRecentMaintenances(maintenances as Maintenance[]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days} dia${days > 1 ? 's' : ''}`;
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statsData = [
    { 
      title: 'Total de Postes', 
      value: poleStats.total.toString(), 
      icon: Lamp, 
      trend: 'Cadastrados',
      iconBg: 'bg-violet-500/15',
      iconColor: 'text-violet-600 dark:text-violet-400',
      gradient: 'from-violet-500/5 to-transparent',
    },
    { 
      title: 'Funcionando', 
      value: poleStats.funcionando.toString(), 
      icon: CheckCircle2, 
      trend: poleStats.total > 0 ? `${Math.round((poleStats.funcionando / poleStats.total) * 100)}%` : '0%',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      gradient: 'from-emerald-500/5 to-transparent',
    },
    { 
      title: 'Com Falhas', 
      value: poleStats.com_falha.toString(), 
      icon: AlertTriangle, 
      trend: 'Necessitam atenção',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
      gradient: 'from-amber-500/5 to-transparent',
    },
    { 
      title: 'Em Manutenção', 
      value: poleStats.em_manutencao.toString(), 
      icon: Wrench, 
      trend: 'Em andamento',
      iconBg: 'bg-sky-500/15',
      iconColor: 'text-sky-600 dark:text-sky-400',
      gradient: 'from-sky-500/5 to-transparent',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="rounded-xl gradient-sunset p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">Dashboard</h1>
            <p className="text-white/80">
              Visão geral do sistema de monitoramento de postes
            </p>
          </div>
          <Button onClick={() => navigate('/manutencoes')} variant="secondary" className="gap-2 shadow-md">
            <Plus className="h-4 w-4" />
            Nova Ocorrência
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-100", stat.gradient)} />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn("p-2.5 rounded-xl", stat.iconBg)}>
                <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Resumo do Sistema
                </CardTitle>
                <CardDescription>Status geral da iluminação</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-300/30 dark:border-emerald-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">Operacionais</span>
                </div>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{poleStats.funcionando}</p>
                <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">postes funcionando</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-300/30 dark:border-amber-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-amber-700 dark:text-amber-300">Com Problemas</span>
                </div>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{poleStats.com_falha}</p>
                <p className="text-sm text-amber-600/70 dark:text-amber-400/70">necessitam reparo</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-300/30 dark:border-sky-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <span className="font-medium text-sky-700 dark:text-sky-300">Em Serviço</span>
                </div>
                <p className="text-3xl font-bold text-sky-700 dark:text-sky-300">{poleStats.em_manutencao}</p>
                <p className="text-sm text-sky-600/70 dark:text-sky-400/70">em manutenção</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Tipos de Iluminação
            </CardTitle>
            <CardDescription>Distribuição por tecnologia</CardDescription>
          </CardHeader>
          <CardContent>
            {lightingTypes.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lightingTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {lightingTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {lightingTypes.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <span className="text-sm font-medium ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <p>Nenhum poste cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Maintenances */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Últimas Ocorrências
              </CardTitle>
              <CardDescription>Chamados de manutenção recentes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/manutencoes')} className="gap-2">
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentMaintenances.length > 0 ? (
            <div className="space-y-4">
              {recentMaintenances.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-white font-semibold text-xs shadow-sm">
                      {item.poles?.code || 'N/A'}
                    </div>
                    <div>
                      <p className="font-medium">{failureTypeLabels[item.failure_type] || item.failure_type}</p>
                      <p className="text-sm text-muted-foreground">{formatTimeAgo(item.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(priorityColors[item.priority])}>
                      {item.priority}
                    </Badge>
                    <Badge variant="outline" className={cn(statusColors[item.status])}>
                      {item.status?.replace('_', ' ')}
                    </Badge>
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
