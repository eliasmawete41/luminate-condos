import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { Button } from '@/components/ui/botao';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/cartao';
import { Badge } from '@/components/ui/etiqueta';
import { Input } from '@/components/ui/entrada';
import { Label } from '@/components/ui/rotulo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/selecao';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/tabela';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialogo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/abas';
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
import { useLeiturasEsp32 } from '@/hooks/useLeiturasEsp32';

// Interface de dispositivo
interface Dispositivo {
  id: string;
  device_token: string;
  name: string;
  pole_id: string | null;
  status: string;
  last_seen_at: string | null;
  created_at: string | null;
  approved_at: string | null;
}

// Interface de poste
interface Poste {
  id: string;
  code: string;
  location_description: string;
}

// Interface de leitura
interface Leitura {
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

// Dispositivo com última leitura
interface DispositivoComUltimaLeitura extends Dispositivo {
  ultimaLeitura?: Leitura;
  poste?: Poste;
}

// Rótulos dos tipos de falha
const rotulosTipoFalha: Record<string, string> = {
  lampada_queimada: 'Lâmpada Queimada',
  curto_circuito: 'Curto-Circuito',
  oscilacao: 'Oscilação',
  fiacao_danificada: 'Fiação Danificada',
  poste_danificado: 'Poste Danificado',
  outros: 'Outros',
};

// Verificar se dispositivo está online (últimos 5 minutos)
function estaOnline(ultimaAtividade: string | null): boolean {
  if (!ultimaAtividade) return false;
  return (Date.now() - new Date(ultimaAtividade).getTime()) < 5 * 60 * 1000;
}

export default function Dispositivos() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogLeiturasAberto, setDialogLeiturasAberto] = useState(false);
  const [dispositivoSelecionado, setDispositivoSelecionado] = useState<Dispositivo | null>(null);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [leiturasTempoReal, setLeiturasTempoReal] = useState<Leitura[]>([]);
  const [novoDispositivo, setNovoDispositivo] = useState({ name: '', pole_id: '' });
  const [dispositivosComLeituras, setDispositivosComLeituras] = useState<DispositivoComUltimaLeitura[]>([]);

  // Buscar dispositivos
  const buscarDispositivos = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('esp32_devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setDispositivos(data as Dispositivo[]);
    setCarregando(false);
  };

  // Buscar postes
  const buscarPostes = async () => {
    const { data } = await supabase.from('poles').select('id, code, location_description');
    if (data) setPostes(data);
  };

  // Buscar dispositivos com últimas leituras
  const buscarDispositivosComLeituras = useCallback(async () => {
    const { data: dadosDispositivos } = await supabase
      .from('esp32_devices')
      .select('*')
      .eq('status', 'aprovado')
      .order('last_seen_at', { ascending: false });

    const { data: dadosPostes } = await supabase
      .from('poles')
      .select('id, code, location_description');

    if (!dadosDispositivos) return;

    const enriquecidos: DispositivoComUltimaLeitura[] = await Promise.all(
      dadosDispositivos.map(async (dispositivo) => {
        const { data: ultimaLeitura } = await supabase
          .from('device_readings')
          .select('*')
          .eq('device_id', dispositivo.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const poste = dadosPostes?.find(p => p.id === dispositivo.pole_id);
        return { ...dispositivo, ultimaLeitura: ultimaLeitura || undefined, poste };
      })
    );

    setDispositivosComLeituras(enriquecidos);
  }, []);

  // Buscar leituras em tempo real
  const buscarLeiturasTempoReal = useCallback(async (idDispositivo?: string) => {
    const consulta = supabase
      .from('device_readings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (idDispositivo) consulta.eq('device_id', idDispositivo);

    const { data } = await consulta;
    if (data) setLeiturasTempoReal(data as Leitura[]);
  }, []);

  useEffect(() => {
    buscarDispositivos();
    buscarPostes();
    buscarDispositivosComLeituras();
    buscarLeiturasTempoReal();

    // Inscrição em tempo real
    const canal = supabase
      .channel('leituras_dispositivos_tempo_real')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'device_readings' },
        (payload) => {
          const novaLeitura = payload.new as Leitura;
          setLeiturasTempoReal(anterior => [novaLeitura, ...anterior].slice(0, 60));
          // Atualizar última leitura do dispositivo
          setDispositivosComLeituras(anterior =>
            anterior.map(d =>
              d.id === novaLeitura.device_id
                ? { ...d, ultimaLeitura: novaLeitura, last_seen_at: novaLeitura.created_at }
                : d
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [buscarDispositivosComLeituras, buscarLeiturasTempoReal]);

  // Cadastrar novo dispositivo
  const cadastrar = async () => {
    if (!novoDispositivo.name) return;

    const { error } = await supabase.from('esp32_devices').insert({
      name: novoDispositivo.name,
      pole_id: novoDispositivo.pole_id || null,
      status: 'pendente',
    });

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao cadastrar dispositivo.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Dispositivo cadastrado. Aguardando aprovação.' });
      setDialogAberto(false);
      setNovoDispositivo({ name: '', pole_id: '' });
      buscarDispositivos();
    }
  };

  // Aprovar dispositivo
  const aprovar = async (dispositivo: Dispositivo) => {
    const { error } = await supabase
      .from('esp32_devices')
      .update({ status: 'aprovado', approved_at: new Date().toISOString() })
      .eq('id', dispositivo.id);

    if (!error) {
      toast({ title: 'Dispositivo aprovado' });
      buscarDispositivos();
      buscarDispositivosComLeituras();
    }
  };

  // Rejeitar dispositivo
  const rejeitar = async (dispositivo: Dispositivo) => {
    const { error } = await supabase
      .from('esp32_devices')
      .update({ status: 'rejeitado' })
      .eq('id', dispositivo.id);

    if (!error) {
      toast({ title: 'Dispositivo rejeitado' });
      buscarDispositivos();
    }
  };

  // Ver leituras do dispositivo
  const verLeituras = async (dispositivo: Dispositivo) => {
    setDispositivoSelecionado(dispositivo);
    const { data } = await supabase
      .from('device_readings')
      .select('*')
      .eq('device_id', dispositivo.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setLeituras(data as Leitura[]);
    setDialogLeiturasAberto(true);
  };

  // Copiar token
  const copiarToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: 'Token copiado!' });
  };

  // Badge de status
  const badgeStatus = (status: string) => {
    const variantes: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pendente: 'outline',
      aprovado: 'default',
      rejeitado: 'destructive',
      inativo: 'secondary',
    };
    const rotulos: Record<string, string> = {
      pendente: 'Pendente',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
      inativo: 'Inativo',
    };
    return <Badge variant={variantes[status] || 'outline'}>{rotulos[status] || status}</Badge>;
  };

  // Dados do gráfico a partir das leituras em tempo real
  const dadosGrafico = leiturasTempoReal
    .slice(0, 30)
    .reverse()
    .map((l, i) => ({
      tempo: l.created_at
        ? format(new Date(l.created_at), 'HH:mm:ss', { locale: ptBR })
        : `#${i}`,
      consumo: l.power_consumption_watts ?? 0,
      falha: l.fault_detected ? 1 : 0,
      ligado: l.is_on ? 1 : 0,
    }));

  // Estatísticas
  const dispositivosAprovados = dispositivosComLeituras;
  const contagemOnline = dispositivosAprovados.filter(d => estaOnline(d.last_seen_at)).length;
  const contagemFalhas = dispositivosAprovados.filter(d => d.ultimaLeitura?.fault_detected).length;
  const totalWatts = dispositivosAprovados.reduce((soma, d) => soma + (d.ultimaLeitura?.power_consumption_watts ?? 0), 0);

  // Leituras em tempo real vindas do webhook /dispositivos (tabela esp32_leituras)
  const { leituras: leiturasWebhook, ultima: ultimaWebhook, carregando: carregandoWebhook } = useLeiturasEsp32(20);

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
          <Button variant="outline" size="icon" onClick={() => { buscarDispositivos(); buscarDispositivosComLeituras(); buscarLeiturasTempoReal(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
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
                    value={novoDispositivo.name}
                    onChange={(e) => setNovoDispositivo(ant => ({ ...ant, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Poste Associado (opcional)</Label>
                  <Select value={novoDispositivo.pole_id} onValueChange={(v) => setNovoDispositivo(ant => ({ ...ant, pole_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um poste" />
                    </SelectTrigger>
                    <SelectContent>
                      {postes.map(poste => (
                        <SelectItem key={poste.id} value={poste.id}>
                          {poste.code} - {poste.location_description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
                <Button onClick={cadastrar} disabled={!novoDispositivo.name}>Cadastrar</Button>
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

        {/* ===== ABA: MONITORAMENTO ===== */}
        <TabsContent value="monitor" className="space-y-6">

          {/* ===== Webhook ESP32 (tempo real) ===== */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-primary" />
                Webhook ESP32 — Tempo Real
                <span className="ml-2 flex items-center gap-1 text-xs font-normal text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  ao vivo
                </span>
              </CardTitle>
              <CardDescription>
                Dados recebidos no endpoint <code className="text-xs">POST /dispositivos</code>
                {ultimaWebhook && (
                  <> · última: {format(new Date(ultimaWebhook.created_at), "HH:mm:ss · dd/MM", { locale: ptBR })}</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {carregandoWebhook ? (
                <p className="text-center text-muted-foreground py-6 text-sm">A carregar…</p>
              ) : !ultimaWebhook ? (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  Nenhuma leitura recebida ainda. Envie um POST para <code>/dispositivos</code>.
                </p>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-xl border bg-accent/30">
                      <p className="text-xs text-muted-foreground mb-1">LDR (luminosidade)</p>
                      <p className="text-3xl font-bold">{ultimaWebhook.ldr}</p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-xl border",
                      ultimaWebhook.poste_bom_status === 'LIGADO' ? "border-primary/40 bg-primary/5" : "bg-muted/30"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground">Poste Bom</p>
                        <Badge variant={ultimaWebhook.poste_bom_status === 'LIGADO' ? 'default' : 'secondary'} className="text-xs">
                          {ultimaWebhook.poste_bom_status}
                        </Badge>
                      </div>
                      <p className="text-sm"><span className="text-muted-foreground">Corrente:</span> <strong>{Number(ultimaWebhook.corrente_poste_bom).toFixed(2)} A</strong></p>
                      <p className="text-sm"><span className="text-muted-foreground">Potência:</span> <strong>{Number(ultimaWebhook.potencia_poste_bom).toFixed(2)} W</strong></p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-xl border",
                      ultimaWebhook.poste_estragado_status === 'LIGADO' ? "border-destructive/40 bg-destructive/5" : "bg-muted/30"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground">Poste Estragado</p>
                        <Badge variant={ultimaWebhook.poste_estragado_status === 'LIGADO' ? 'destructive' : 'secondary'} className="text-xs">
                          {ultimaWebhook.poste_estragado_status}
                        </Badge>
                      </div>
                      <p className="text-sm"><span className="text-muted-foreground">Corrente:</span> <strong>{Number(ultimaWebhook.corrente_poste_estragado).toFixed(2)} A</strong></p>
                      <p className="text-sm"><span className="text-muted-foreground">Potência:</span> <strong>{Number(ultimaWebhook.potencia_poste_estragado).toFixed(2)} W</strong></p>
                    </div>
                  </div>

                  <div className="overflow-auto max-h-72 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Horário</TableHead>
                          <TableHead>LDR</TableHead>
                          <TableHead>Bom</TableHead>
                          <TableHead>I Bom (A)</TableHead>
                          <TableHead>P Bom (W)</TableHead>
                          <TableHead>Estragado</TableHead>
                          <TableHead>I Estr. (A)</TableHead>
                          <TableHead>P Estr. (W)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leiturasWebhook.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {format(new Date(l.created_at), "HH:mm:ss", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm">{l.ldr}</TableCell>
                            <TableCell>
                              <Badge variant={l.poste_bom_status === 'LIGADO' ? 'default' : 'secondary'} className="text-xs">{l.poste_bom_status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{Number(l.corrente_poste_bom).toFixed(2)}</TableCell>
                            <TableCell className="text-sm">{Number(l.potencia_poste_bom).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={l.poste_estragado_status === 'LIGADO' ? 'destructive' : 'secondary'} className="text-xs">{l.poste_estragado_status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{Number(l.corrente_poste_estragado).toFixed(2)}</TableCell>
                            <TableCell className="text-sm">{Number(l.potencia_poste_estragado).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Cartões KPI */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dispositivos Online</CardTitle>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Wifi className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{contagemOnline}</div>
                <p className="text-xs text-muted-foreground mt-1">de {dispositivosAprovados.length} aprovados</p>
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
                <div className="text-3xl font-bold">{dispositivosAprovados.length - contagemOnline}</div>
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
                <div className="text-3xl font-bold text-destructive">{contagemFalhas}</div>
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

          {/* Gráficos */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de Consumo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Consumo de Energia (W)
                </CardTitle>
                <CardDescription>Últimas leituras de todos os dispositivos</CardDescription>
              </CardHeader>
              <CardContent>
                {dadosGrafico.length > 0 ? (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dadosGrafico} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradConsumo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(24 95% 53%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(24 95% 53%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="tempo" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(valor: number) => [`${valor}W`, 'Consumo']} />
                        <Area type="monotone" dataKey="consumo" stroke="hsl(24 95% 53%)" strokeWidth={2} fill="url(#gradConsumo)" />
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

            {/* Gráfico de Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Status (Ligado / Falha)
                </CardTitle>
                <CardDescription>Histórico de estados das leituras</CardDescription>
              </CardHeader>
              <CardContent>
                {dadosGrafico.length > 0 ? (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dadosGrafico} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="tempo" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} domain={[0, 1]} tickFormatter={(v) => v === 1 ? 'Sim' : 'Não'} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(valor: number, nome: string) => [valor === 1 ? 'Sim' : 'Não', nome === 'ligado' ? 'Ligado' : 'Falha']} />
                        <Legend formatter={(valor) => valor === 'ligado' ? 'Ligado' : 'Falha'} wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="step" dataKey="ligado" stroke="hsl(142 70% 45%)" strokeWidth={2} dot={false} />
                        <Line type="step" dataKey="falha" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
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

          {/* Cartões de Dispositivos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Status por Dispositivo
              </CardTitle>
              <CardDescription>Atualizado automaticamente via tempo real</CardDescription>
            </CardHeader>
            <CardContent>
              {dispositivosAprovados.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Cpu className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum dispositivo aprovado ainda.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dispositivosAprovados.map(dispositivo => {
                    const online = estaOnline(dispositivo.last_seen_at);
                    const temFalha = dispositivo.ultimaLeitura?.fault_detected;
                    const estaLigado = dispositivo.ultimaLeitura?.is_on;
                    const watts = dispositivo.ultimaLeitura?.power_consumption_watts;

                    return (
                      <div
                        key={dispositivo.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all",
                          temFalha
                            ? "border-destructive/40 bg-destructive/5"
                            : online
                              ? "border-border bg-accent/30"
                              : "border-border bg-muted/30"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-sm">{dispositivo.name}</p>
                            {dispositivo.poste && (
                              <p className="text-xs text-muted-foreground">{dispositivo.poste.code}</p>
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
                            {estaLigado ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="text-muted-foreground">{estaLigado ? 'Ligado' : 'Desligado'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            <span className="text-muted-foreground">{watts != null ? `${watts}W` : '—'}</span>
                          </div>
                        </div>

                        {temFalha && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-destructive font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {rotulosTipoFalha[dispositivo.ultimaLeitura?.fault_type ?? ''] || 'Falha detectada'}
                          </div>
                        )}

                        {dispositivo.last_seen_at && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Última leitura:{' '}
                            {format(new Date(dispositivo.last_seen_at), "HH:mm:ss · dd/MM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Leituras Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Feed de Leituras em Tempo Real
              </CardTitle>
              <CardDescription>Atualizando automaticamente conforme o ESP32 envia dados</CardDescription>
            </CardHeader>
            <CardContent>
              {leiturasTempoReal.length === 0 ? (
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
                      {leiturasTempoReal.map(l => {
                        const disp = dispositivos.find(d => d.id === l.device_id);
                        return (
                          <TableRow key={l.id} className={cn(l.fault_detected && "bg-destructive/5")}>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {l.created_at && format(new Date(l.created_at), "HH:mm:ss", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm font-medium">{disp?.name ?? l.device_id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <Badge variant={l.is_on ? 'default' : 'secondary'} className="text-xs">
                                {l.is_on ? 'Ligado' : 'Desligado'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {l.fault_detected ? (
                                <Badge variant="destructive" className="text-xs">
                                  {rotulosTipoFalha[l.fault_type ?? ''] || 'Falha'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {l.power_consumption_watts != null ? `${l.power_consumption_watts}W` : '—'}
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

        {/* ===== ABA: GERENCIAR DISPOSITIVOS ===== */}
        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Dispositivos Cadastrados</CardTitle>
              <CardDescription>{dispositivos.length} dispositivo(s) cadastrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {carregando ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : dispositivos.length === 0 ? (
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
                    {dispositivos.map(dispositivo => (
                      <TableRow key={dispositivo.id}>
                        <TableCell className="font-medium">{dispositivo.name}</TableCell>
                        <TableCell>{badgeStatus(dispositivo.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => copiarToken(dispositivo.device_token)} className="gap-1">
                            <Copy className="h-3 w-3" />
                            <span className="font-mono text-xs">{dispositivo.device_token.slice(0, 8)}...</span>
                          </Button>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {dispositivo.last_seen_at
                            ? format(new Date(dispositivo.last_seen_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {dispositivo.created_at && format(new Date(dispositivo.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => verLeituras(dispositivo)} title="Ver leituras">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {dispositivo.status === 'pendente' && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => aprovar(dispositivo)} title="Aprovar" className="text-primary hover:text-primary/80">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => rejeitar(dispositivo)} title="Rejeitar" className="text-destructive hover:text-destructive/80">
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

      {/* Diálogo de Leituras */}
      <Dialog open={dialogLeiturasAberto} onOpenChange={setDialogLeiturasAberto}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leituras - {dispositivoSelecionado?.name}</DialogTitle>
            <DialogDescription>Últimas 50 leituras do dispositivo</DialogDescription>
          </DialogHeader>
          {leituras.length === 0 ? (
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
                {leituras.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">
                      {l.created_at && format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.is_on ? 'default' : 'secondary'}>{l.is_on ? 'Ligado' : 'Desligado'}</Badge>
                    </TableCell>
                    <TableCell>
                      {l.fault_detected ? (
                        <Badge variant="destructive">{rotulosTipoFalha[l.fault_type ?? ''] || 'Detectada'}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{l.power_consumption_watts ?? '—'}</TableCell>
                    <TableCell className="text-sm font-mono">
                      {l.latitude && l.longitude ? `${l.latitude}, ${l.longitude}` : '—'}
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
