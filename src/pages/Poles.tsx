import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Plus, Search, Filter, Lamp, MapPin, Zap, MoreHorizontal,
  CheckCircle2, AlertTriangle, Wrench, XCircle, Loader2, Pencil, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Pole = Database['public']['Tables']['poles']['Row'];
type PoleInsert = Database['public']['Tables']['poles']['Insert'];

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  funcionando: { label: 'Funcionando', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  com_falha: { label: 'Com Falha', icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  em_manutencao: { label: 'Em Manutenção', icon: Wrench, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  desativado: { label: 'Desativado', icon: XCircle, color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
};

const lightingTypes: Record<string, string> = {
  led: 'LED', fluorescente: 'Fluorescente', solar: 'Solar',
  halogenea: 'Halógena', vapor_sodio: 'Vapor de Sódio', vapor_mercurio: 'Vapor de Mercúrio',
};

export default function Poles() {
  const { toast } = useToast();
  const { isManutencao, isSindico } = useAuth();
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPole, setEditingPole] = useState<Pole | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '', location_description: '', lighting_type: '' as any,
    power_watts: '', installation_date: '', lamp_lifespan_hours: '50000',
    maintenance_company: '', latitude: '', longitude: '',
  });

  useEffect(() => { fetchPoles(); }, []);

  const fetchPoles = async () => {
    try {
      const { data, error } = await supabase.from('poles').select('*').order('code', { ascending: true });
      if (error) throw error;
      setPoles(data || []);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os postes', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleCreatePole = async () => {
    if (!formData.code || !formData.location_description || !formData.lighting_type || !formData.power_watts) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const newPole: PoleInsert = {
        code: formData.code, location_description: formData.location_description,
        lighting_type: formData.lighting_type, power_watts: parseInt(formData.power_watts),
        installation_date: formData.installation_date || null,
        lamp_lifespan_hours: parseInt(formData.lamp_lifespan_hours) || 50000,
        maintenance_company: formData.maintenance_company || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };
      const { error } = await supabase.from('poles').insert(newPole);
      if (error) throw error;
      toast({ title: 'Poste cadastrado com sucesso' });
      setIsDialogOpen(false);
      setFormData({ code: '', location_description: '', lighting_type: '', power_watts: '', installation_date: '', lamp_lifespan_hours: '50000', maintenance_company: '', latitude: '', longitude: '' });
      fetchPoles();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleEditPole = async () => {
    if (!editingPole) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('poles').update({
        code: formData.code, location_description: formData.location_description,
        lighting_type: formData.lighting_type, power_watts: parseInt(formData.power_watts),
        maintenance_company: formData.maintenance_company || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      }).eq('id', editingPole.id);
      if (error) throw error;
      toast({ title: 'Poste atualizado com sucesso' });
      setEditDialogOpen(false);
      setEditingPole(null);
      fetchPoles();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleChangeStatus = async (poleId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('poles').update({ status: newStatus as any }).eq('id', poleId);
      if (error) throw error;
      toast({ title: `Status atualizado para ${statusConfig[newStatus]?.label}` });
      fetchPoles();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeletePole = async (poleId: string) => {
    try {
      const { error } = await supabase.from('poles').delete().eq('id', poleId);
      if (error) throw error;
      toast({ title: 'Poste removido com sucesso' });
      fetchPoles();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (pole: Pole) => {
    setEditingPole(pole);
    setFormData({
      code: pole.code, location_description: pole.location_description,
      lighting_type: pole.lighting_type, power_watts: pole.power_watts.toString(),
      installation_date: pole.installation_date || '', lamp_lifespan_hours: (pole.lamp_lifespan_hours || 50000).toString(),
      maintenance_company: pole.maintenance_company || '',
      latitude: pole.latitude?.toString() || '', longitude: pole.longitude?.toString() || '',
    });
    setEditDialogOpen(true);
  };

  const filteredPoles = poles.filter(pole => {
    const matchesSearch = pole.code.toLowerCase().includes(searchTerm.toLowerCase()) || pole.location_description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pole.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getLampHealthPercentage = (hours: number | null, lifespan: number | null) => {
    if (!lifespan || lifespan === 0) return 100;
    return Math.max(0, Math.round(((lifespan - (hours || 0)) / lifespan) * 100));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const poleFormFields = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Código do Poste *</Label>
          <Input placeholder="Ex: P-001" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Tipo de Iluminação *</Label>
          <Select value={formData.lighting_type} onValueChange={(v) => setFormData({ ...formData, lighting_type: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{Object.entries(lightingTypes).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Localização *</Label>
        <Input placeholder="Ex: Entrada Principal, Bloco A" value={formData.location_description} onChange={(e) => setFormData({ ...formData, location_description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Potência (W) *</Label>
          <Input type="number" placeholder="Ex: 100" value={formData.power_watts} onChange={(e) => setFormData({ ...formData, power_watts: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Empresa de Manutenção</Label>
          <Input placeholder="Nome da empresa" value={formData.maintenance_company} onChange={(e) => setFormData({ ...formData, maintenance_company: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Latitude</Label>
          <Input type="number" step="any" placeholder="-23.5505" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Longitude</Label>
          <Input type="number" step="any" placeholder="-46.6333" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl gradient-sunset p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20"><Lamp className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">Postes</h1>
              <p className="text-white/80">Gerenciamento e monitoramento de postes de iluminação</p>
            </div>
          </div>
          {isManutencao && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2 shadow-md"><Plus className="h-4 w-4" />Novo Poste</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Poste</DialogTitle>
                  <DialogDescription>Preencha as informações do novo poste de iluminação</DialogDescription>
                </DialogHeader>
                {poleFormFields}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreatePole} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por código ou localização..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(statusConfig).map(([v, c]) => (<SelectItem key={v} value={v}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lamp className="h-5 w-5 text-primary" />Lista de Postes</CardTitle>
          <CardDescription>{filteredPoles.length} postes encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPoles.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Código</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Potência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vida Útil</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPoles.map((pole) => {
                    const status = statusConfig[pole.status || 'funcionando'];
                    const StatusIcon = status.icon;
                    const health = getLampHealthPercentage(pole.current_lamp_hours, pole.lamp_lifespan_hours);
                    return (
                      <TableRow key={pole.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Lamp className="h-4 w-4" /></div>
                            <span className="font-medium">{pole.code}</span>
                          </div>
                        </TableCell>
                        <TableCell><div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{pole.location_description}</div></TableCell>
                        <TableCell><Badge variant="outline" className="bg-accent/50">{lightingTypes[pole.lighting_type] || pole.lighting_type}</Badge></TableCell>
                        <TableCell><div className="flex items-center gap-1"><Zap className="h-4 w-4 text-amber-500" />{pole.power_watts}W</div></TableCell>
                        <TableCell><Badge variant="outline" className={cn(status.color)}><StatusIcon className="mr-1 h-3 w-3" />{status.label}</Badge></TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Restante</span>
                              <span className={cn("font-medium", health > 50 ? "text-emerald-600" : health > 20 ? "text-amber-600" : "text-red-600")}>{health}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", health > 50 ? "bg-emerald-500" : health > 20 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${health}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(pole)}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {Object.entries(statusConfig).filter(([k]) => k !== pole.status).map(([k, v]) => (
                                <DropdownMenuItem key={k} onClick={() => handleChangeStatus(pole.id, k)}>
                                  <v.icon className="h-3.5 w-3.5 mr-2" />{v.label}
                                </DropdownMenuItem>
                              ))}
                              {isSindico && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePole(pole.id)}>
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
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
              <Lamp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum poste encontrado</p>
              {isManutencao && (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Cadastrar primeiro poste</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Poste</DialogTitle>
            <DialogDescription>Atualize as informações do poste {editingPole?.code}</DialogDescription>
          </DialogHeader>
          {poleFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditPole} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
