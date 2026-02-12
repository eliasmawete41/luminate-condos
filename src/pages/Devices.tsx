import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Check, X, Cpu, RefreshCw, Copy, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  is_on: boolean;
  fault_detected: boolean;
  fault_type: string | null;
  power_consumption_watts: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
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
  const [newDevice, setNewDevice] = useState({ name: '', pole_id: '' });

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

  useEffect(() => {
    fetchDevices();
    fetchPoles();
  }, []);

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
          <p className="text-muted-foreground">Gerencie os dispositivos IoT conectados aos postes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchDevices}>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Dispositivos</CardTitle>
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
                            <Button variant="ghost" size="icon" onClick={() => handleApprove(device)} title="Aprovar" className="text-green-600 hover:text-green-700">
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
                        <Badge variant="destructive">{r.fault_type || 'Detectada'}</Badge>
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
