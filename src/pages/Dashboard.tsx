import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lamp, 
  AlertTriangle, 
  Wrench, 
  CheckCircle2, 
  TrendingUp, 
  Activity,
  Clock,
  Zap,
  ArrowRight,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
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

const statsData = [
  { 
    title: 'Total de Postes', 
    value: '48', 
    icon: Lamp, 
    trend: '+2 este mês',
    color: 'bg-primary/10 text-primary'
  },
  { 
    title: 'Funcionando', 
    value: '42', 
    icon: CheckCircle2, 
    trend: '87.5%',
    color: 'bg-green-500/10 text-green-600'
  },
  { 
    title: 'Com Falhas', 
    value: '4', 
    icon: AlertTriangle, 
    trend: '2 urgentes',
    color: 'bg-amber-500/10 text-amber-600'
  },
  { 
    title: 'Em Manutenção', 
    value: '2', 
    icon: Wrench, 
    trend: 'Previsão: 2 dias',
    color: 'bg-blue-500/10 text-blue-600'
  },
];

const chartData = [
  { name: 'Jan', falhas: 4, manutencoes: 6 },
  { name: 'Fev', falhas: 3, manutencoes: 4 },
  { name: 'Mar', falhas: 6, manutencoes: 8 },
  { name: 'Abr', falhas: 2, manutencoes: 5 },
  { name: 'Mai', falhas: 5, manutencoes: 7 },
  { name: 'Jun', falhas: 3, manutencoes: 4 },
];

const pieData = [
  { name: 'LED', value: 30, color: 'hsl(210, 85%, 45%)' },
  { name: 'Solar', value: 10, color: 'hsl(142, 70%, 45%)' },
  { name: 'Fluorescente', value: 5, color: 'hsl(38, 92%, 50%)' },
  { name: 'Outras', value: 3, color: 'hsl(215, 20%, 65%)' },
];

const recentMaintenances = [
  { id: 1, pole: 'P-012', type: 'Lâmpada queimada', status: 'aberto', priority: 'alta', date: '2h atrás' },
  { id: 2, pole: 'P-034', type: 'Oscilação', status: 'em_andamento', priority: 'media', date: '5h atrás' },
  { id: 3, pole: 'P-008', type: 'Curto-circuito', status: 'concluido', priority: 'urgente', date: '1 dia' },
  { id: 4, pole: 'P-021', type: 'Lâmpada queimada', status: 'aberto', priority: 'baixa', date: '2 dias' },
];

const statusColors: Record<string, string> = {
  aberto: 'bg-amber-500/10 text-amber-600 border-amber-200',
  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-200',
  concluido: 'bg-green-500/10 text-green-600 border-green-200',
};

const priorityColors: Record<string, string> = {
  baixa: 'bg-slate-100 text-slate-600',
  media: 'bg-amber-100 text-amber-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de monitoramento de postes
          </p>
        </div>
        <Button onClick={() => navigate('/manutencoes/nova')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Ocorrência
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Histórico de Ocorrências
                </CardTitle>
                <CardDescription>Falhas e manutenções nos últimos 6 meses</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Ver detalhes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorFalhas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorManutencoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210, 85%, 45%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(210, 85%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="falhas" 
                    stroke="hsl(0, 72%, 51%)" 
                    fillOpacity={1} 
                    fill="url(#colorFalhas)" 
                    name="Falhas"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="manutencoes" 
                    stroke="hsl(210, 85%, 45%)" 
                    fillOpacity={1} 
                    fill="url(#colorManutencoes)" 
                    name="Manutenções"
                  />
                </AreaChart>
              </ResponsiveContainer>
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
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {pieData.map((item) => (
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
          <div className="space-y-4">
            {recentMaintenances.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/manutencoes/${item.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {item.pole}
                  </div>
                  <div>
                    <p className="font-medium">{item.type}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(priorityColors[item.priority])}>
                    {item.priority}
                  </Badge>
                  <Badge variant="outline" className={cn(statusColors[item.status])}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
