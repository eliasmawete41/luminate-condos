import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, Filter, Wrench, Clock, User, MoreHorizontal,
  AlertCircle, CheckCircle2, Timer, XCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Maintenance = Database['public']['Tables']['maintenances']['Row'] & {
  poles: { code: string; location_description: string } | null;
};
type Pole = Database['public']['Tables']['poles']['Row'];

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  aberto: { label: 'Aberto', icon: AlertCircle, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  em_andamento: { label: 'Em Andamento', icon: Timer, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  concluido: { label: 'Concluído', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
  media: { label: 'Média', color: 'bg-amber-100 text-amber-700' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const failureTypes: Record<string, string> = {
  lampada_queimada: 'Lâmpada Queimada', curto_circuito: 'Curto-Circuito',
  oscilacao: 'Oscilação', fiacao_danificada: 'Fiação Danificada',
  poste_danificado: 'Poste Danificado', outros: 'Outros',
};

export default function Maintenances() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    pole_id: '', failure_type: '' as any,
    priority: 'media' as Database['public']['Enums']['priority_level'],
    description: '', scheduled_date: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [maintenancesRes, polesRes] = await Promise.all([
        supabase.from('maintenances').select('*, poles(code, location_description)').order('created_at', { ascending: false }),
        supabase.from('poles').select('*').order('code'),
      ]);
      if (maintenancesRes.error) throw maintenancesRes.error;
      if (polesRes.error) throw polesRes.error;
      setMaintenances((maintenancesRes.data as unknown as Maintenance[]) || []);
      setPoles(polesRes.data || []);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleCreateMaintenance = async () => {
    if (!formData.pole_id || !formData.failure_type || !formData.description) {
      toast({ title: 'Campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('maintenances').insert({
        pole_id: formData.pole_id, failure_type: formData.failure_type,
        priority: formData.priority, description: formData.description,
        scheduled_date: formData.scheduled_date || null, reported_by: user?.id,
      });
      if (error) throw error;
      // Update pole status
      await supabase.from('poles').update({ status: 'com_falha' as any }).eq('id', formData.pole_id);
      toast({ title: 'Ocorrência registrada com sucesso' });
      setIsDialogOpen(false);
      setFormData({ pole_id: '', failure_type: '', priority: 'media', description: '', scheduled_date: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'concluido') updateData.completed_date = new Date().toISOString().split('T')[0];
      if (newStatus === 'cancelado') updateData.completed_date = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('maintenances').update(updateData).eq('id', id);
      if (error) throw error;
      toast({ title: `Status atualizado para ${statusConfig[newStatus]?.label}` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const filteredMaintenances = maintenances.filter(m => {
    const matchesSearch = m.poles?.code?.toLowerCase().includes(searchTerm.toLowerCase()) || m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || m.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getStatusCounts = () => {
    const counts: Record<string, number> = { aberto: 0, em_andamento: 0, concluido: 0, cancelado: 0 };
    maintenances.forEach(m => { if (m.status) counts[m.status] = (counts[m.status] || 0) + 1; });
    return counts;
  };
  const statusCounts = getStatusCounts();

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl gradient-sunset p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20"><Wrench className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">Manutenções</h1>
              <p className="text-white/80">Acompanhamento de chamados e ocorrências</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2 shadow-md"><Plus className="h-4 w-4" />Nova Ocorrência</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Nova Ocorrência</DialogTitle>
                <DialogDescription>Preencha as informações para abrir um chamado de manutenção</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Poste *</Label>
                    <Select value={formData.pole_id} onValueChange={(v) => setFormData({ ...formData, pole_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{poles.map(p => (<SelectItem key={p.id} value={p.id}>{p.code} - {p.location_description}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Falha *</Label>
                    <Select value={formData.failure_type} onValueChange={(v) => setFormData({ ...formData, failure_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{Object.entries(failureTypes).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(priorityConfig).map(([v, c]) => (<SelectItem key={v} value={v}>{c.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Agendada</Label>
                    <Input type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Textarea placeholder="Descreva o problema..." rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateMaintenance} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = statusCounts[key] || 0;
          const StatusIcon = config.icon;
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(key === statusFilter ? 'all' : key)}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <div className={cn("p-3 rounded-full", config.color)}><StatusIcon className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(statusConfig).map(([v, c]) => (<SelectItem key={v} value={v}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(priorityConfig).map(([v, c]) => (<SelectItem key={v} value={v}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />Lista de Ocorrências</CardTitle>
          <CardDescription>{filteredMaintenances.length} ocorrências encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMaintenances.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Poste</TableHead>
                    <TableHead>Tipo de Falha</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaintenances.map((m) => {
                    const status = statusConfig[m.status || 'aberto'];
                    const priority = priorityConfig[m.priority || 'media'];
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={m.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div><p className="font-medium">{m.poles?.code || 'N/A'}</p><p className="text-sm text-muted-foreground">{m.poles?.location_description || ''}</p></div>
                        </TableCell>
                        <TableCell><span className="text-sm">{failureTypes[m.failure_type] || m.failure_type}</span></TableCell>
                        <TableCell><Badge variant="secondary" className={cn(priority.color)}>{priority.label}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={cn(status.color)}><StatusIcon className="mr-1 h-3 w-3" />{status.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />{m.created_at ? formatDate(m.created_at) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {Object.entries(statusConfig).filter(([k]) => k !== m.status).map(([k, v]) => (
                                <DropdownMenuItem key={k} onClick={() => handleUpdateStatus(m.id, k)}>
                                  <v.icon className="h-3.5 w-3.5 mr-2" />{v.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma ocorrência encontrada</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Registrar primeira ocorrência</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
