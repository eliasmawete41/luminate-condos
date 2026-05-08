import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/cartao';
import { Button } from '@/components/ui/botao';
import { Input } from '@/components/ui/entrada';
import { Badge } from '@/components/ui/etiqueta';
import { Label } from '@/components/ui/rotulo';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/tabela';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialogo';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/selecao';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/abas';
import {
  Plus, Search, Building2, Home, Users, Car, MoreHorizontal, Loader2, Pencil, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/menu-suspenso';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import type { Database } from '@/integrations/supabase/types';

type Bloco = Database['public']['Tables']['blocks']['Row'];
type Unidade = Database['public']['Tables']['units']['Row'] & { blocks: { name: string } | null };

// Configuração de status das unidades
const configStatus: Record<string, { rotulo: string; cor: string }> = {
  ocupada: { rotulo: 'Ocupada', cor: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  vazia: { rotulo: 'Vazia', cor: 'bg-slate-500/10 text-slate-600 border-slate-200' },
  alugada: { rotulo: 'Alugada', cor: 'bg-blue-500/10 text-blue-600 border-blue-200' },
};

export default function Unidades() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroBloco, setFiltroBloco] = useState<string>('all');
  const [filtroStatus, setFiltroStatus] = useState<string>('all');
  const [dialogBlocoAberto, setDialogBlocoAberto] = useState(false);
  const [dialogUnidadeAberto, setDialogUnidadeAberto] = useState(false);
  const [dialogEditarUnidadeAberto, setDialogEditarUnidadeAberto] = useState(false);
  const [dialogEditarBlocoAberto, setDialogEditarBlocoAberto] = useState(false);
  const [unidadeEditando, setUnidadeEditando] = useState<Unidade | null>(null);
  const [blocoEditando, setBlocoEditando] = useState<Bloco | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [formularioBloco, setFormularioBloco] = useState({ name: '', description: '' });
  const [formularioUnidade, setFormularioUnidade] = useState({
    block_id: '', number: '', floor: '', parking_spots: '0',
    status: 'vazia' as Database['public']['Enums']['unit_status'],
  });

  useEffect(() => { buscarDados(); }, []);

  // Buscar blocos e unidades
  const buscarDados = async () => {
    try {
      const [resBlocos, resUnidades] = await Promise.all([
        supabase.from('blocks').select('*').order('name'),
        supabase.from('units').select('*, blocks(name)').order('number'),
      ]);
      if (resBlocos.error) throw resBlocos.error;
      if (resUnidades.error) throw resUnidades.error;
      setBlocos(resBlocos.data || []);
      setUnidades((resUnidades.data as unknown as Unidade[]) || []);
    } catch (erro) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados', variant: 'destructive' });
    } finally { setCarregando(false); }
  };

  // Criar bloco
  const criarBloco = async () => {
    if (!formularioBloco.name) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      const { error } = await supabase.from('blocks').insert({ name: formularioBloco.name, description: formularioBloco.description || null });
      if (error) throw error;
      toast({ title: 'Bloco cadastrado com sucesso' });
      setDialogBlocoAberto(false);
      setFormularioBloco({ name: '', description: '' });
      buscarDados();
    } catch (erro: any) { toast({ title: 'Erro', description: erro.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  // Criar unidade
  const criarUnidade = async () => {
    if (!formularioUnidade.block_id || !formularioUnidade.number) { toast({ title: 'Campos obrigatórios', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      const { error } = await supabase.from('units').insert({
        block_id: formularioUnidade.block_id, number: formularioUnidade.number,
        floor: formularioUnidade.floor ? parseInt(formularioUnidade.floor) : null,
        parking_spots: parseInt(formularioUnidade.parking_spots) || 0, status: formularioUnidade.status,
      });
      if (error) throw error;
      toast({ title: 'Unidade cadastrada com sucesso' });
      setDialogUnidadeAberto(false);
      setFormularioUnidade({ block_id: '', number: '', floor: '', parking_spots: '0', status: 'vazia' });
      buscarDados();
    } catch (erro: any) { toast({ title: 'Erro', description: erro.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  // Editar unidade
  const editarUnidade = async () => {
    if (!unidadeEditando) return;
    setSalvando(true);
    try {
      const { error } = await supabase.from('units').update({
        block_id: formularioUnidade.block_id, number: formularioUnidade.number,
        floor: formularioUnidade.floor ? parseInt(formularioUnidade.floor) : null,
        parking_spots: parseInt(formularioUnidade.parking_spots) || 0, status: formularioUnidade.status,
      }).eq('id', unidadeEditando.id);
      if (error) throw error;
      toast({ title: 'Unidade atualizada' });
      setDialogEditarUnidadeAberto(false);
      setUnidadeEditando(null);
      buscarDados();
    } catch (erro: any) { toast({ title: 'Erro', description: erro.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  // Excluir unidade
  const excluirUnidade = async (id: string) => {
    try {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Unidade removida' });
      buscarDados();
    } catch (erro: any) { toast({ title: 'Erro', description: erro.message, variant: 'destructive' }); }
  };

  // Editar bloco
  const editarBloco = async () => {
    if (!blocoEditando) return;
    setSalvando(true);
    try {
      const { error } = await supabase.from('blocks').update({
        name: formularioBloco.name, description: formularioBloco.description || null,
      }).eq('id', blocoEditando.id);
      if (error) throw error;
      toast({ title: 'Bloco atualizado' });
      setDialogEditarBlocoAberto(false);
      setBlocoEditando(null);
      buscarDados();
    } catch (erro: any) { toast({ title: 'Erro', description: erro.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  // Excluir bloco
  const excluirBloco = async (id: string) => {
    try {
      const { error } = await supabase.from('blocks').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Bloco removido' });
      buscarDados();
    } catch (erro: any) { toast({ title: 'Erro', description: erro.message, variant: 'destructive' }); }
  };

  // Abrir edição de unidade
  const abrirEdicaoUnidade = (unidade: Unidade) => {
    setUnidadeEditando(unidade);
    setFormularioUnidade({
      block_id: unidade.block_id, number: unidade.number,
      floor: unidade.floor?.toString() || '', parking_spots: (unidade.parking_spots || 0).toString(),
      status: (unidade.status || 'vazia') as any,
    });
    setDialogEditarUnidadeAberto(true);
  };

  // Abrir edição de bloco
  const abrirEdicaoBloco = (bloco: Bloco) => {
    setBlocoEditando(bloco);
    setFormularioBloco({ name: bloco.name, description: bloco.description || '' });
    setDialogEditarBlocoAberto(true);
  };

  // Filtrar unidades
  const unidadesFiltradas = unidades.filter(unidade => {
    const correspondeABusca = unidade.number.toLowerCase().includes(termoBusca.toLowerCase()) || unidade.blocks?.name?.toLowerCase().includes(termoBusca.toLowerCase());
    const correspondeAoBloco = filtroBloco === 'all' || unidade.block_id === filtroBloco;
    const correspondeAoStatus = filtroStatus === 'all' || unidade.status === filtroStatus;
    return correspondeABusca && correspondeAoBloco && correspondeAoStatus;
  });

  // Contagem por status
  const contagemStatus = (() => {
    const c: Record<string, number> = { ocupada: 0, vazia: 0, alugada: 0 };
    unidades.forEach(u => { if (u.status) c[u.status] = (c[u.status] || 0) + 1; });
    return c;
  })();

  if (carregando) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Campos do formulário de unidade
  const camposFormularioUnidade = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Bloco *</Label>
          <Select value={formularioUnidade.block_id} onValueChange={(v) => setFormularioUnidade({ ...formularioUnidade, block_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{blocos.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Número *</Label>
          <Input placeholder="Ex: 101" value={formularioUnidade.number} onChange={(e) => setFormularioUnidade({ ...formularioUnidade, number: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Andar</Label>
          <Input type="number" placeholder="1" value={formularioUnidade.floor} onChange={(e) => setFormularioUnidade({ ...formularioUnidade, floor: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Vagas</Label>
          <Input type="number" placeholder="2" value={formularioUnidade.parking_spots} onChange={(e) => setFormularioUnidade({ ...formularioUnidade, parking_spots: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Situação</Label>
          <Select value={formularioUnidade.status} onValueChange={(v) => setFormularioUnidade({ ...formularioUnidade, status: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(configStatus).map(([v, c]) => (<SelectItem key={v} value={v}>{c.rotulo}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-2xl gradient-sunset p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/20"><Building2 className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">Unidades</h1>
            <p className="text-white/80">Gestão de blocos e apartamentos do condomínio</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="units" className="space-y-6">
        <TabsList><TabsTrigger value="units">Unidades</TabsTrigger><TabsTrigger value="blocks">Blocos</TabsTrigger></TabsList>

        <TabsContent value="units" className="space-y-6">
          {/* Estatísticas */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{unidades.length}</p></div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary"><Home className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
            {Object.entries(configStatus).map(([chave, config]) => (
              <Card key={chave}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-muted-foreground">{config.rotulo}</p><p className="text-2xl font-bold">{contagemStatus[chave] || 0}</p></div>
                    <Badge variant="outline" className={cn(config.cor, "text-lg px-3 py-1")}>{unidades.length > 0 ? Math.round(((contagemStatus[chave] || 0) / unidades.length) * 100) : 0}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-4 md:flex-row md:items-center flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar unidade..." className="pl-10" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} />
                  </div>
                  <Select value={filtroBloco} onValueChange={setFiltroBloco}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Bloco" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos</SelectItem>{blocos.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(configStatus).map(([v, c]) => (<SelectItem key={v} value={v}>{c.rotulo}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                {isAdmin && (
                  <Dialog open={dialogUnidadeAberto} onOpenChange={setDialogUnidadeAberto}>
                    <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Nova Unidade</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Cadastrar Nova Unidade</DialogTitle></DialogHeader>
                      {camposFormularioUnidade}
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogUnidadeAberto(false)}>Cancelar</Button>
                        <Button onClick={criarUnidade} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-primary" />Lista de Unidades</CardTitle>
              <CardDescription>{unidadesFiltradas.length} unidades encontradas</CardDescription>
            </CardHeader>
            <CardContent>
              {unidadesFiltradas.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Unidade</TableHead><TableHead>Bloco</TableHead><TableHead>Andar</TableHead>
                        <TableHead>Status</TableHead><TableHead>Vagas</TableHead><TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unidadesFiltradas.map((unidade) => {
                        const status = configStatus[unidade.status || 'vazia'];
                        return (
                          <TableRow key={unidade.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Home className="h-4 w-4" /></div>
                                <span className="font-medium">{unidade.number}</span>
                              </div>
                            </TableCell>
                            <TableCell><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{unidade.blocks?.name || '-'}</div></TableCell>
                            <TableCell>{unidade.floor ? `${unidade.floor}º` : '-'}</TableCell>
                            <TableCell><Badge variant="outline" className={cn(status.cor)}>{status.rotulo}</Badge></TableCell>
                            <TableCell><div className="flex items-center gap-1"><Car className="h-4 w-4 text-muted-foreground" />{unidade.parking_spots || 0}</div></TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => abrirEdicaoUnidade(unidade)}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive" onClick={() => excluirUnidade(unidade.id)}>
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
                <div className="text-center py-12"><Home className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Nenhuma unidade encontrada</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Blocos */}
        <TabsContent value="blocks" className="space-y-6">
          {isAdmin && (
            <div className="flex justify-end">
              <Dialog open={dialogBlocoAberto} onOpenChange={setDialogBlocoAberto}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Novo Bloco</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Cadastrar Novo Bloco</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input placeholder="Ex: Bloco D" value={formularioBloco.name} onChange={(e) => setFormularioBloco({ ...formularioBloco, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input placeholder="Ex: 10 andares" value={formularioBloco.description} onChange={(e) => setFormularioBloco({ ...formularioBloco, description: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogBlocoAberto(false)}>Cancelar</Button>
                    <Button onClick={criarBloco} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {blocos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {blocos.map(bloco => {
                const unidadesDoBloco = unidades.filter(u => u.block_id === bloco.id);
                return (
                  <Card key={bloco.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Building2 className="h-6 w-6" /></div>
                          <CardTitle>{bloco.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => abrirEdicaoBloco(bloco)}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => excluirBloco(bloco.id)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription>{bloco.description || 'Sem descrição'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground"><Home className="h-4 w-4" /><span>{unidadesDoBloco.length} unidades</span></div>
                        <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /><span>{unidadesDoBloco.filter(u => u.status === 'ocupada' || u.status === 'alugada').length} ocupadas</span></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12"><Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Nenhum bloco cadastrado</p></div>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo Editar Unidade */}
      <Dialog open={dialogEditarUnidadeAberto} onOpenChange={setDialogEditarUnidadeAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Unidade {unidadeEditando?.number}</DialogTitle></DialogHeader>
          {camposFormularioUnidade}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditarUnidadeAberto(false)}>Cancelar</Button>
            <Button onClick={editarUnidade} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Editar Bloco */}
      <Dialog open={dialogEditarBlocoAberto} onOpenChange={setDialogEditarBlocoAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Bloco {blocoEditando?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={formularioBloco.name} onChange={(e) => setFormularioBloco({ ...formularioBloco, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={formularioBloco.description} onChange={(e) => setFormularioBloco({ ...formularioBloco, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditarBlocoAberto(false)}>Cancelar</Button>
            <Button onClick={editarBloco} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
