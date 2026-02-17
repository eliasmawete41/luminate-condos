import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Check, X, Cpu, RefreshCw, Copy, Eye,
  Wifi, WifiOff, Zap, AlertTriangle, Activity,
  CheckCircle2, Circle, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Legend
} from 'recharts';
import { cn } from '@/lib/utils';

interface Device {
  id: string;
  device_token: string;
  name: string;
  pole_id: string | null;
  status: string;
  last_seen_at: string | null;
  created_at: string | null;
  approved_at: string | null;
}

interface Pole {
  id: string;
  code: string;
  location_description: string;
}

interface Reading {
  id: string;
  device_id: string;
  is_on: boolean;
  fault_detected: boolean;
  fault_type: string | null;
  power_consumption_watts: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
}

interface DeviceWithLastReading extends Device {
  lastReading?: Reading;
  pole?: Pole;
}

const faultTypeLabels: Record<string, string> = {
  lampada_queimada: 'Lâmpada Queimada',
  curto_circuito: 'Curto-Circuito',
  oscilacao: 'Oscilação',
  fiacao_danificada: 'Fiação Danificada',
  poste_danificado: 'Poste Danificado',
  outros: 'Outros',
};

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000; // 5 min
}

export default function Devices() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [readingsDialogOpen, setReadingsDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [realtimeReadings, setRealtimeReadings] = useState<Reading[]>([]);
  const [newDevice, setNewDevice] = useState({ name: '', pole_id: '' });
  const [devicesWithReadings, setDevicesWithReadings] = useState<DeviceWithLastReading[]>([]);

  const fetchDevices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('esp32_devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setDevices(data as Device[]);
    setLoading(false);
  };

  const fetchPoles = async () => {
    const { data } = await supabase.from('poles').select('id, code, location_description');
    if (data) setPoles(data);
  };

  const fetchDevicesWithReadings = useCallback(async () => {
    const { data: devicesData } = await supabase
      .from('esp32_devices')
      .select('*')
      .eq('status', 'aprovado')
      .order('last_seen_at', { ascending: false });

    const { data: polesData } = await supabase
      .from('poles')
      .select('id, code, location_description');

    if (!devicesData) return;

    const enriched: DeviceWithLastReading[] = await Promise.all(
      devicesData.map(async (device) => {
        const { data: lastRead } = await supabase
          .from('device_readings')
          .select('*')
          .eq('device_id', device.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const pole = polesData?.find(p => p.id === device.pole_id);
        return { ...device, lastReading: lastRead || undefined, pole };
      })
    );

    setDevicesWithReadings(enriched);
  }, []);

  const fetchRealtimeReadings = useCallback(async (deviceId?: string) => {
    const query = supabase
      .from('device_readings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (deviceId) query.eq('device_id', deviceId);

    const { data } = await query;
    if (data) setRealtimeReadings(data as Reading[]);
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchPoles();
    fetchDevicesWithReadings();
    fetchRealtimeReadings();

    // Realtime subscription
    const channel = supabase
      .channel('device_readings_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'device_readings' },
        (payload) => {
          const newReading = payload.new as Reading;
          setRealtimeReadings(prev => [newReading, ...prev].slice(0, 60));
          // Update last reading for device
          setDevicesWithReadings(prev =>
            prev.map(d =>
              d.id === newReading.device_id
                ? { ...d, lastReading: newReading, last_seen_at: newReading.created_at }
                : d
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDevicesWithReadings, fetchRealtimeReadings]);

  const handleCreate = async () => {
    if (!newDevice.name) return;

    const { error } = await supabase.from('esp32_devices').insert({
      name: newDevice.name,
      pole_id: newDevice.pole_id || null,
      status: 'pendente',
    });

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao cadastrar dispositivo.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Dispositivo cadastrado. Aguardando aprovação.' });
      setDialogOpen(false);
      setNewDevice({ name: '', pole_id: '' });
      fetchDevices();
    }
  };

  const handleApprove = async (device: Device) => {
    const { error } = await supabase
      .from('esp32_devices')
      .update({ status: 'aprovado', approved_at: new Date().toISOString() })
      .eq('id', device.id);

    if (!error) {
      toast({ title: 'Dispositivo aprovado' });
      fetchDevices();
      fetchDevicesWithReadings();
    }
  };

  const handleReject = async (device: Device) => {
    const { error } = await supabase
      .from('esp32_devices')
      .update({ status: 'rejeitado' })
      .eq('id', device.id);

    if (!error) {
      toast({ title: 'Dispositivo rejeitado' });
      fetchDevices();
    }
  };

  const handleViewReadings = async (device: Device) => {
    setSelectedDevice(device);
    const { data } = await supabase
      .from('device_readings')
      .select('*')
      .eq('device_id', device.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setReadings(data as Reading[]);
    setReadingsDialogOpen(true);
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: 'Token copiado!' });
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pendente: 'outline',
      aprovado: 'default',
      rejeitado: 'destructive',
      inativo: 'secondary',
    };
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
      inativo: 'Inativo',
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  // Build chart data from realtime readings (last 30 points aggregated by device)
  const chartData = realtimeReadings
    .slice(0, 30)
    .reverse()
    .map((r, i) => ({
      time: r.created_at
        ? format(new Date(r.created_at), 'HH:mm:ss', { locale: ptBR })
        : `#${i}`,
      consumo: r.power_consumption_watts ?? 0,
      falha: r.fault_detected ? 1 : 0,
      ligado: r.is_on ? 1 : 0,
    }));

  // Stats
  const approvedDevices = devicesWithReadings;
  const onlineCount = approvedDevices.filter(d => isOnline(d.last_seen_at)).length;
  const faultCount = approvedDevices.filter(d => d.lastReading?.fault_detected).length;
  const totalWatts = approvedDevices.reduce((sum, d) => sum + (d.lastReading?.power_consumption_watts ?? 0), 0);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Apenas administradores podem gerenciar dispositivos ESP32.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispositivos ESP32</h1>
          <p className="text-muted-foreground">Gerencie e monitore os dispositivos IoT conectados aos postes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => { fetchDevices(); fetchDevicesWithReadings(); fetchRealtimeReadings(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Dispositivo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Dispositivo ESP32</DialogTitle>
                <DialogDescription>O dispositivo receberá um token único para autenticação.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Dispositivo</Label>
                  <Input
                    placeholder="Ex: ESP32-Poste-01"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Poste Associado (opcional)</Label>
                  <Select value={newDevice.pole_id} onValueChange={(v) => setNewDevice(prev => ({ ...prev, pole_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um poste" />
                    </SelectTrigger>
                    <SelectContent>
                      {poles.map(pole => (
                        <SelectItem key={pole.id} value={pole.id}>
                          {pole.code} - {pole.location_description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={!newDevice.name}>Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="monitor">
        <TabsList className="mb-4">
          <TabsTrigger value="monitor" className="gap-2">
            <Activity className="h-4 w-4" /> Monitoramento em Tempo Real
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Cpu className="h-4 w-4" /> Gerenciar Dispositivos
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: MONITORAMENTO ===== */}
        <TabsContent value="monitor" className="space-y-6">

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dispositivos Online</CardTitle>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Wifi className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{onlineCount}</div>
                <p className="text-xs text-muted-foreground mt-1">de {approvedDevices.length} aprovados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Offline / Sem Sinal</CardTitle>
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <WifiOff className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{approvedDevices.length - onlineCount}</div>
                <p className="text-xs text-muted-foreground mt-1">sem atividade recente</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Falhas Ativas</CardTitle>
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{faultCount}</div>
                <p className="text-xs text-muted-foreground mt-1">detectadas agora</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Consumo Total</CardTitle>
                <div className="p-2 rounded-lg bg-secondary/30 text-secondary-foreground">
                  <Zap className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalWatts.toFixed(0)}W</div>
                <p className="text-xs text-muted-foreground mt-1">em tempo real</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Consumption Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Consumo de Energia (W)
                </CardTitle>
                <CardDescription>Últimas leituras de todos os dispositivos</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="consumoGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(24 95% 53%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(24 95% 53%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number) => [`${value}W`, 'Consumo']}
                        />
                        <Area
                          type="monotone"
                          dataKey="consumo"
                          stroke="hsl(24 95% 53%)"
                          strokeWidth={2}
                          fill="url(#consumoGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                    Aguardando leituras dos dispositivos...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Status (Ligado / Falha)
                </CardTitle>
                <CardDescription>Histórico de estados das leituras</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 1]}
                          tickFormatter={(v) => v === 1 ? 'Sim' : 'Não'}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number, name: string) => [
                            value === 1 ? 'Sim' : 'Não',
                            name === 'ligado' ? 'Ligado' : 'Falha'
                          ]}
                        />
                        <Legend
                          formatter={(value) => value === 'ligado' ? 'Ligado' : 'Falha'}
                          wrapperStyle={{ fontSize: '12px' }}
                        />
                        <Line
                          type="step"
                          dataKey="ligado"
                          stroke="hsl(142 70% 45%)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="step"
                          dataKey="falha"
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                    Aguardando leituras dos dispositivos...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Device Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Status por Dispositivo
              </CardTitle>
              <CardDescription>Atualizado automaticamente via tempo real</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedDevices.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Cpu className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum dispositivo aprovado ainda.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {approvedDevices.map(device => {
                    const online = isOnline(device.last_seen_at);
                    const hasFault = device.lastReading?.fault_detected;
                    const isOn = device.lastReading?.is_on;
                    const watts = device.lastReading?.power_consumption_watts;

                    return (
                      <div
                        key={device.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all",
                          hasFault
                            ? "border-destructive/40 bg-destructive/5"
                            : online
                              ? "border-border bg-accent/30"
                              : "border-border bg-muted/30"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-sm">{device.name}</p>
                            {device.pole && (
                              <p className="text-xs text-muted-foreground">{device.pole.code}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {online ? (
                              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                </span>
                                Online
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Circle className="h-2 w-2 fill-muted-foreground" />
                                Offline
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            {isOn ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="text-muted-foreground">{isOn ? 'Ligado' : 'Desligado'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            <span className="text-muted-foreground">{watts != null ? `${watts}W` : '—'}</span>
                          </div>
                        </div>

                        {hasFault && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-destructive font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {faultTypeLabels[device.lastReading?.fault_type ?? ''] || 'Falha detectada'}
                          </div>
                        )}

                        {device.last_seen_at && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Última leitura:{' '}
                            {format(new Date(device.last_seen_at), "HH:mm:ss · dd/MM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Readings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Feed de Leituras em Tempo Real
              </CardTitle>
              <CardDescription>Atualizando automaticamente conforme o ESP32 envia dados</CardDescription>
            </CardHeader>
            <CardContent>
              {realtimeReadings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhuma leitura recebida ainda. Configure seu ESP32 para começar.
                </p>
              ) : (
                <div className="overflow-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Horário</TableHead>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Falha</TableHead>
                        <TableHead>Consumo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {realtimeReadings.map(r => {
                        const device = devices.find(d => d.id === r.device_id);
                        return (
                          <TableRow key={r.id} className={cn(r.fault_detected && "bg-destructive/5")}>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {r.created_at && format(new Date(r.created_at), "HH:mm:ss", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm font-medium">{device?.name ?? r.device_id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <Badge variant={r.is_on ? 'default' : 'secondary'} className="text-xs">
                                {r.is_on ? 'Ligado' : 'Desligado'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {r.fault_detected ? (
                                <Badge variant="destructive" className="text-xs">
                                  {faultTypeLabels[r.fault_type ?? ''] || 'Falha'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.power_consumption_watts != null ? `${r.power_consumption_watts}W` : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: GERENCIAR DISPOSITIVOS ===== */}
        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Dispositivos Cadastrados</CardTitle>
              <CardDescription>{devices.length} dispositivo(s) cadastrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : devices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum dispositivo cadastrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Última Atividade</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map(device => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.name}</TableCell>
                        <TableCell>{statusBadge(device.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => copyToken(device.device_token)} className="gap-1">
                            <Copy className="h-3 w-3" />
                            <span className="font-mono text-xs">{device.device_token.slice(0, 8)}...</span>
                          </Button>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {device.last_seen_at
                            ? format(new Date(device.last_seen_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {device.created_at && format(new Date(device.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => handleViewReadings(device)} title="Ver leituras">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {device.status === 'pendente' && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleApprove(device)} title="Aprovar" className="text-primary hover:text-primary/80">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleReject(device)} title="Rejeitar" className="text-destructive hover:text-destructive/80">
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Readings Dialog */}
      <Dialog open={readingsDialogOpen} onOpenChange={setReadingsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leituras - {selectedDevice?.name}</DialogTitle>
            <DialogDescription>Últimas 50 leituras do dispositivo</DialogDescription>
          </DialogHeader>
          {readings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma leitura registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Falha</TableHead>
                  <TableHead>Consumo (W)</TableHead>
                  <TableHead>Coordenadas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {r.created_at && format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_on ? 'default' : 'secondary'}>{r.is_on ? 'Ligado' : 'Desligado'}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.fault_detected ? (
                        <Badge variant="destructive">{faultTypeLabels[r.fault_type ?? ''] || 'Detectada'}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.power_consumption_watts ?? '—'}</TableCell>
                    <TableCell className="text-sm font-mono">
                      {r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
