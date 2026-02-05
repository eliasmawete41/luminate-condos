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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Search, 
  Building2,
  Home,
  Users,
  Car,
  MoreHorizontal,
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

type Block = Database['public']['Tables']['blocks']['Row'];
type Unit = Database['public']['Tables']['units']['Row'] & {
  blocks: { name: string } | null;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  ocupada: { label: 'Ocupada', color: 'bg-green-500/10 text-green-600 border-green-200' },
  vazia: { label: 'Vazia', color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
  alugada: { label: 'Alugada', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
};

export default function Units() {
  const { toast } = useToast();
  const { isSindico } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [blockForm, setBlockForm] = useState({ name: '', description: '' });
  const [unitForm, setUnitForm] = useState({ 
    block_id: '', 
    number: '', 
    floor: '', 
    parking_spots: '0',
    status: 'vazia' as Database['public']['Enums']['unit_status']
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [blocksRes, unitsRes] = await Promise.all([
        supabase.from('blocks').select('*').order('name'),
        supabase.from('units').select('*, blocks(name)').order('number'),
      ]);

      if (blocksRes.error) throw blocksRes.error;
      if (unitsRes.error) throw unitsRes.error;

      setBlocks(blocksRes.data || []);
      setUnits((unitsRes.data as unknown as Unit[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlock = async () => {
    if (!blockForm.name) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('blocks').insert({
        name: blockForm.name,
        description: blockForm.description || null,
      });

      if (error) throw error;

      toast({ title: 'Bloco cadastrado com sucesso' });
      setIsBlockDialogOpen(false);
      setBlockForm({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUnit = async () => {
    if (!unitForm.block_id || !unitForm.number) {
      toast({ title: 'Campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('units').insert({
        block_id: unitForm.block_id,
        number: unitForm.number,
        floor: unitForm.floor ? parseInt(unitForm.floor) : null,
        parking_spots: parseInt(unitForm.parking_spots) || 0,
        status: unitForm.status,
      });

      if (error) throw error;

      toast({ title: 'Unidade cadastrada com sucesso' });
      setIsUnitDialogOpen(false);
      setUnitForm({ block_id: '', number: '', floor: '', parking_spots: '0', status: 'vazia' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredUnits = units.filter(unit => {
    const matchesSearch = 
      unit.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.blocks?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBlock = blockFilter === 'all' || unit.block_id === blockFilter;
    const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
    return matchesSearch && matchesBlock && matchesStatus;
  });

  const getStatusCounts = () => {
    const counts: Record<string, number> = { ocupada: 0, vazia: 0, alugada: 0 };
    units.forEach(u => {
      if (u.status) counts[u.status] = (counts[u.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Unidades</h1>
          <p className="text-muted-foreground">
            Gestão de blocos e apartamentos do condomínio
          </p>
        </div>
      </div>

      <Tabs defaultValue="units" className="space-y-6">
        <TabsList>
          <TabsTrigger value="units">Unidades</TabsTrigger>
          <TabsTrigger value="blocks">Blocos</TabsTrigger>
        </TabsList>

        {/* Units Tab */}
        <TabsContent value="units" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{units.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Home className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = statusCounts[key] || 0;
              return (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{config.label}</p>
                        <p className="text-2xl font-bold">{count}</p>
                      </div>
                      <Badge variant="outline" className={cn(config.color, "text-lg px-3 py-1")}>
                        {units.length > 0 ? Math.round((count / units.length) * 100) : 0}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-4 md:flex-row md:items-center flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar unidade..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={blockFilter} onValueChange={setBlockFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Bloco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {blocks.map(block => (
                        <SelectItem key={block.id} value={block.id}>{block.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(statusConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isSindico && (
                  <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nova Unidade
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cadastrar Nova Unidade</DialogTitle>
                        <DialogDescription>
                          Adicione um novo apartamento ao condomínio
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Bloco *</Label>
                            <Select 
                              value={unitForm.block_id}
                              onValueChange={(v) => setUnitForm({ ...unitForm, block_id: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {blocks.map(block => (
                                  <SelectItem key={block.id} value={block.id}>{block.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Número *</Label>
                            <Input 
                              placeholder="Ex: 101" 
                              value={unitForm.number}
                              onChange={(e) => setUnitForm({ ...unitForm, number: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Andar</Label>
                            <Input 
                              type="number" 
                              placeholder="Ex: 1" 
                              value={unitForm.floor}
                              onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Vagas de Garagem</Label>
                            <Input 
                              type="number" 
                              placeholder="Ex: 2" 
                              value={unitForm.parking_spots}
                              onChange={(e) => setUnitForm({ ...unitForm, parking_spots: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Situação</Label>
                          <Select 
                            value={unitForm.status}
                            onValueChange={(v) => setUnitForm({ ...unitForm, status: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([value, config]) => (
                                <SelectItem key={value} value={value}>{config.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateUnit} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Salvar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Lista de Unidades
              </CardTitle>
              <CardDescription>
                {filteredUnits.length} unidades encontradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUnits.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Unidade</TableHead>
                        <TableHead>Bloco</TableHead>
                        <TableHead>Andar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vagas</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnits.map((unit) => {
                        const status = statusConfig[unit.status || 'vazia'];
                        return (
                          <TableRow key={unit.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                                  <Home className="h-4 w-4" />
                                </div>
                                <span className="font-medium">{unit.number}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {unit.blocks?.name || '-'}
                              </div>
                            </TableCell>
                            <TableCell>{unit.floor ? `${unit.floor}º` : '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(status.color)}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                {unit.parking_spots || 0}
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
                                  <DropdownMenuItem>Gerenciar moradores</DropdownMenuItem>
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
                  <Home className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma unidade encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocks Tab */}
        <TabsContent value="blocks" className="space-y-6">
          {isSindico && (
            <div className="flex justify-end">
              <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Bloco
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Bloco</DialogTitle>
                    <DialogDescription>
                      Adicione um novo bloco ao condomínio
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome do Bloco *</Label>
                      <Input 
                        placeholder="Ex: Bloco D" 
                        value={blockForm.name}
                        onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input 
                        placeholder="Ex: 10 andares, 40 apartamentos" 
                        value={blockForm.description}
                        onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateBlock} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {blocks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {blocks.map(block => {
                const blockUnits = units.filter(u => u.block_id === block.id);
                return (
                  <Card key={block.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-6 w-6" />
                          </div>
                          <CardTitle>{block.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Ver unidades</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription>{block.description || 'Sem descrição'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Home className="h-4 w-4" />
                          <span>{blockUnits.length} unidades</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{blockUnits.filter(u => u.status === 'ocupada' || u.status === 'alugada').length} ocupadas</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum bloco cadastrado</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
