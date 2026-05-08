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
import { useAuth } from '@/contexts/ContextoAutenticacao';
import type { Database } from '@/integrations/supabase/types';

type Manutencao = Database['public']['Tables']['maintenances']['Row'] & {
  poles: { code: string; location_description: string } | null;
};
type Poste = Database['public']['Tables']['poles']['Row'];

// Configuração de status das manutenções
const configStatus: Record<string, { rotulo: string; icone: React.ElementType; cor: string }> = {
  aberto: { rotulo: 'Aberto', icone: AlertCircle, cor: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  em_andamento: { rotulo: 'Em Andamento', icone: Timer, cor: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  concluido: { rotulo: 'Concluído', icone: CheckCircle2, cor: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  cancelado: { rotulo: 'Cancelado', icone: XCircle, cor: 'bg-slate-500/10 text-slate-600 border-slate-200' },
};

// Configuração de prioridades
const configPrioridade: Record<string, { rotulo: string; cor: string }> = {
  baixa: { rotulo: 'Baixa', cor: 'bg-slate-100 text-slate-600' },
  media: { rotulo: 'Média', cor: 'bg-amber-100 text-amber-700' },
  alta: { rotulo: 'Alta', cor: 'bg-orange-100 text-orange-700' },
  urgente: { rotulo: 'Urgente', cor: 'bg-red-100 text-red-700' },
};

// Tipos de falha
const tiposFalha: Record<string, string> = {
  lampada_queimada: 'Lâmpada Queimada', curto_circuito: 'Curto-Circuito',
  oscilacao: 'Oscilação', fiacao_danificada: 'Fiação Danificada',
  poste_danificado: 'Poste Danificado', outros: 'Outros',
};

export default function Manutencoes() {
  const { toast } = useToast();
  const { user: usuario } = useAuth();
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('all');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('all');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [dadosFormulario, setDadosFormulario] = useState({
    pole_id: '', failure_type: '' as any,
    priority: 'media' as Database['public']['Enums']['priority_level'],
    description: '', scheduled_date: '',
  });

  useEffect(() => { buscarDados(); }, []);

  // Buscar manutenções e postes
  const buscarDados = async () => {
    try {
      const [resManutencoes, resPostes] = await Promise.all([
        supabase.from('maintenances').select('*, poles(code, location_description)').order('created_at', { ascending: false }),
        supabase.from('poles').select('*').order('code'),
      ]);
      if (resManutencoes.error) throw resManutencoes.error;
      if (resPostes.error) throw resPostes.error;
      setManutencoes((resManutencoes.data as unknown as Manutencao[]) || []);
      setPostes(resPostes.data || []);
    } catch (erro) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados', variant: 'destructive' });
    } finally { setCarregando(false); }
  };

  // Criar nova ocorrência de manutenção
  const criarManutencao = async () => {
    if (!dadosFormulario.pole_id || !dadosFormulario.failure_type || !dadosFormulario.description) {
      toast({ title: 'Campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.from('maintenances').insert({
        pole_id: dadosFormulario.pole_id, failure_type: dadosFormulario.failure_type,
        priority: dadosFormulario.priority, description: dadosFormulario.description,
        scheduled_date: dadosFormulario.scheduled_date || null, reported_by: usuario?.id,
      });
      if (error) throw error;
      // Atualizar status do poste
      await supabase.from('poles').update({ status: 'com_falha' as any }).eq('id', dadosFormulario.pole_id);
      toast({ title: 'Ocorrência registrada com sucesso' });
      setDialogAberto(false);
      setDadosFormulario({ pole_id: '', failure_type: '', priority: 'media', description: '', scheduled_date: '' });
      buscarDados();
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    } finally { setSalvando(false); }
  };

  // Atualizar status da manutenção
  const atualizarStatus = async (id: string, novoStatus: string) => {
    try {
      const dadosAtualizacao: any = { status: novoStatus };
      if (novoStatus === 'concluido') dadosAtualizacao.completed_date = new Date().toISOString().split('T')[0];
      if (novoStatus === 'cancelado') dadosAtualizacao.completed_date = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('maintenances').update(dadosAtualizacao).eq('id', id);
      if (error) throw error;
      toast({ title: `Status atualizado para ${configStatus[novoStatus]?.rotulo}` });
      buscarDados();
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    }
  };

  // Filtrar manutenções
  const manutencoesFiltradas = manutencoes.filter(m => {
    const correspondeABusca = m.poles?.code?.toLowerCase().includes(termoBusca.toLowerCase()) || m.description.toLowerCase().includes(termoBusca.toLowerCase());
    const correspondeAoStatus = filtroStatus === 'all' || m.status === filtroStatus;
    const correspondeAPrioridade = filtroPrioridade === 'all' || m.priority === filtroPrioridade;
    return correspondeABusca && correspondeAoStatus && correspondeAPrioridade;
  });

  // Formatar data
  const formatarData = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Contagem por status
  const obterContagemStatus = () => {
    const contagem: Record<string, number> = { aberto: 0, em_andamento: 0, concluido: 0, cancelado: 0 };
    manutencoes.forEach(m => { if (m.status) contagem[m.status] = (contagem[m.status] || 0) + 1; });
    return contagem;
  };
  const contagemStatus = obterContagemStatus();

  if (carregando) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-2xl gradient-sunset p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20"><Wrench className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">Manutenções</h1>
              <p className="text-white/80">Acompanhamento de chamados e ocorrências</p>
            </div>
          </div>
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
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
                    <Select value={dadosFormulario.pole_id} onValueChange={(v) => setDadosFormulario({ ...dadosFormulario, pole_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{postes.map(p => (<SelectItem key={p.id} value={p.id}>{p.code} - {p.location_description}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Falha *</Label>
                    <Select value={dadosFormulario.failure_type} onValueChange={(v) => setDadosFormulario({ ...dadosFormulario, failure_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{Object.entries(tiposFalha).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={dadosFormulario.priority} onValueChange={(v) => setDadosFormulario({ ...dadosFormulario, priority: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(configPrioridade).map(([v, c]) => (<SelectItem key={v} value={v}>{c.rotulo}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Agendada</Label>
                    <Input type="date" value={dadosFormulario.scheduled_date} onChange={(e) => setDadosFormulario({ ...dadosFormulario, scheduled_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Textarea placeholder="Descreva o problema..." rows={4} value={dadosFormulario.description} onChange={(e) => setDadosFormulario({ ...dadosFormulario, description: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
                <Button onClick={criarManutencao} disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(configStatus).map(([chave, config]) => {
          const contagem = contagemStatus[chave] || 0;
          const IconeStatus = config.icone;
          return (
            <Card key={chave} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroStatus(chave === filtroStatus ? 'all' : chave)}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{config.rotulo}</p>
                    <p className="text-2xl font-bold">{contagem}</p>
                  </div>
                  <div className={cn("p-3 rounded-full", config.cor)}><IconeStatus className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-10" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(configStatus).map(([v, c]) => (<SelectItem key={v} value={v}>{c.rotulo}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(configPrioridade).map(([v, c]) => (<SelectItem key={v} value={v}>{c.rotulo}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />Lista de Ocorrências</CardTitle>
          <CardDescription>{manutencoesFiltradas.length} ocorrências encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          {manutencoesFiltradas.length > 0 ? (
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
                  {manutencoesFiltradas.map((m) => {
                    const status = configStatus[m.status || 'aberto'];
                    const prioridade = configPrioridade[m.priority || 'media'];
                    const IconeStatus = status.icone;
                    return (
                      <TableRow key={m.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div><p className="font-medium">{m.poles?.code || 'N/A'}</p><p className="text-sm text-muted-foreground">{m.poles?.location_description || ''}</p></div>
                        </TableCell>
                        <TableCell><span className="text-sm">{tiposFalha[m.failure_type] || m.failure_type}</span></TableCell>
                        <TableCell><Badge variant="secondary" className={cn(prioridade.cor)}>{prioridade.rotulo}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={cn(status.cor)}><IconeStatus className="mr-1 h-3 w-3" />{status.rotulo}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />{m.created_at ? formatarData(m.created_at) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {Object.entries(configStatus).filter(([k]) => k !== m.status).map(([k, v]) => (
                                <DropdownMenuItem key={k} onClick={() => atualizarStatus(m.id, k)}>
                                  <v.icone className="h-3.5 w-3.5 mr-2" />{v.rotulo}
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
              <Button className="mt-4" onClick={() => setDialogAberto(true)}><Plus className="h-4 w-4 mr-2" />Registrar primeira ocorrência</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
