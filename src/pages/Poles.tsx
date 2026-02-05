import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Filter, 
  Lamp,
  MapPin,
  Zap,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Pole = Database['public']['Tables']['poles']['Row'];
type PoleInsert = Database['public']['Tables']['poles']['Insert'];

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  funcionando: { label: 'Funcionando', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600 border-green-200' },
  com_falha: { label: 'Com Falha', icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  em_manutencao: { label: 'Em Manutenção', icon: Wrench, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  desativado: { label: 'Desativado', icon: XCircle, color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
};

const lightingTypes: Record<string, string> = {
  led: 'LED',
  fluorescente: 'Fluorescente',
  solar: 'Solar',
  halogenea: 'Halógena',
  vapor_sodio: 'Vapor de Sódio',
  vapor_mercurio: 'Vapor de Mercúrio',
};

export default function Poles() {
  const { toast } = useToast();
  const { isManutencao } = useAuth();
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    location_description: '',
    lighting_type: '' as Database['public']['Enums']['lighting_type'] | '',
    power_watts: '',
    installation_date: '',
    lamp_lifespan_hours: '50000',
    maintenance_company: '',
  });

  useEffect(() => {
    fetchPoles();
  }, []);

  const fetchPoles = async () => {
    try {
      const { data, error } = await supabase
        .from('poles')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      setPoles(data || []);
    } catch (error) {
      console.error('Error fetching poles:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os postes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePole = async () => {
    if (!formData.code || !formData.location_description || !formData.lighting_type || !formData.power_watts) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const newPole: PoleInsert = {
        code: formData.code,
        location_description: formData.location_description,
        lighting_type: formData.lighting_type as Database['public']['Enums']['lighting_type'],
        power_watts: parseInt(formData.power_watts),
        installation_date: formData.installation_date || null,
        lamp_lifespan_hours: parseInt(formData.lamp_lifespan_hours) || 50000,
        maintenance_company: formData.maintenance_company || null,
      };

      const { error } = await supabase.from('poles').insert(newPole);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Poste cadastrado com sucesso',
      });

      setIsDialogOpen(false);
      setFormData({
        code: '',
        location_description: '',
        lighting_type: '',
        power_watts: '',
        installation_date: '',
        lamp_lifespan_hours: '50000',
        maintenance_company: '',
      });
      fetchPoles();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível cadastrar o poste',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredPoles = poles.filter(pole => {
    const matchesSearch = 
      pole.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pole.location_description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pole.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getLampHealthPercentage = (hours: number | null, lifespan: number | null) => {
    if (!lifespan || lifespan === 0) return 100;
    const currentHours = hours || 0;
    return Math.max(0, Math.round(((lifespan - currentHours) / lifespan) * 100));
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Postes</h1>
          <p className="text-muted-foreground">
            Gerenciamento e monitoramento de postes de iluminação
          </p>
        </div>
        {isManutencao && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Poste
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Poste</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo poste de iluminação
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código do Poste *</Label>
                    <Input 
                      id="code" 
                      placeholder="Ex: P-001" 
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Iluminação *</Label>
                    <Select 
                      value={formData.lighting_type}
                      onValueChange={(value) => setFormData({ ...formData, lighting_type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(lightingTypes).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Localização *</Label>
                  <Input 
                    id="location" 
                    placeholder="Ex: Entrada Principal, Bloco A" 
                    value={formData.location_description}
                    onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="power">Potência (W) *</Label>
                    <Input 
                      id="power" 
                      type="number" 
                      placeholder="Ex: 100" 
                      value={formData.power_watts}
                      onChange={(e) => setFormData({ ...formData, power_watts: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installDate">Data de Instalação</Label>
                    <Input 
                      id="installDate" 
                      type="date" 
                      value={formData.installation_date}
                      onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lifespan">Vida Útil da Lâmpada (horas)</Label>
                    <Input 
                      id="lifespan" 
                      type="number" 
                      placeholder="Ex: 50000" 
                      value={formData.lamp_lifespan_hours}
                      onChange={(e) => setFormData({ ...formData, lamp_lifespan_hours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa de Manutenção</Label>
                    <Input 
                      id="company" 
                      placeholder="Nome da empresa" 
                      value={formData.maintenance_company}
                      onChange={(e) => setFormData({ ...formData, maintenance_company: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePole} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou localização..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="funcionando">Funcionando</SelectItem>
                  <SelectItem value="com_falha">Com Falha</SelectItem>
                  <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                  <SelectItem value="desativado">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lamp className="h-5 w-5 text-primary" />
            Lista de Postes
          </CardTitle>
          <CardDescription>
            {filteredPoles.length} postes encontrados
          </CardDescription>
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
                    const healthPercentage = getLampHealthPercentage(pole.current_lamp_hours, pole.lamp_lifespan_hours);
                    
                    return (
                      <TableRow key={pole.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                              <Lamp className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{pole.code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {pole.location_description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-accent/50">
                            {lightingTypes[pole.lighting_type] || pole.lighting_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-amber-500" />
                            {pole.power_watts}W
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(status.color)}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Restante</span>
                              <span className={cn(
                                "font-medium",
                                healthPercentage > 50 ? "text-green-600" :
                                healthPercentage > 20 ? "text-amber-600" : "text-red-600"
                              )}>
                                {healthPercentage}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  healthPercentage > 50 ? "bg-green-500" :
                                  healthPercentage > 20 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${healthPercentage}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem>Abrir chamado</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Desativar
                              </DropdownMenuItem>
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
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar primeiro poste
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
