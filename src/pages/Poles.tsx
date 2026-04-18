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

type Poste = Database['public']['Tables']['poles']['Row'];
type PosteInsercao = Database['public']['Tables']['poles']['Insert'];

// Configuração de status dos postes
const configStatus: Record<string, { rotulo: string; icone: React.ElementType; cor: string }> = {
  funcionando: { rotulo: 'Funcionando', icone: CheckCircle2, cor: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  com_falha: { rotulo: 'Com Falha', icone: AlertTriangle, cor: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  em_manutencao: { rotulo: 'Em Manutenção', icone: Wrench, cor: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  desativado: { rotulo: 'Desativado', icone: XCircle, cor: 'bg-slate-500/10 text-slate-600 border-slate-200' },
};

// Tipos de iluminação
const tiposIluminacao: Record<string, string> = {
  led: 'LED', fluorescente: 'Fluorescente', solar: 'Solar',
  halogenea: 'Halógena', vapor_sodio: 'Vapor de Sódio', vapor_mercurio: 'Vapor de Mercúrio',
};

export default function Postes() {
  const { toast } = useToast();
  const { isManutencao, isSindico } = useAuth();
  const [postes, setPostes] = useState<Poste[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('all');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogEdicaoAberto, setDialogEdicaoAberto] = useState(false);
  const [posteEditando, setPosteEditando] = useState<Poste | null>(null);
  const [salvando, setSalvando] = useState(false);

  // lamp_lifespan_years: vida útil da lâmpada em anos (convertida internamente para horas)
  const [dadosFormulario, setDadosFormulario] = useState({
    code: '', location_description: '', lighting_type: '' as any,
    power_watts: '', installation_date: '', lamp_lifespan_years: '3',
    maintenance_company: '', latitude: '', longitude: '',
  });

  // Constante de conversão: assume 12h/dia de funcionamento
  const HORAS_POR_ANO = 12 * 365;
  const horasParaAnos = (horas: number | null) => Math.round(((horas || 0) / HORAS_POR_ANO) * 10) / 10;
  const anosParaHoras = (anos: number) => Math.round(anos * HORAS_POR_ANO);

  // Gerar próximo código no formato END-001
  const gerarProximoCodigo = (lista: Poste[]) => {
    const numeros = lista
      .map(p => {
        const m = p.code.match(/^END-(\d+)$/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => n > 0);
    const proximo = (numeros.length ? Math.max(...numeros) : 0) + 1;
    return `END-${String(proximo).padStart(3, '0')}`;
  };

  useEffect(() => { buscarPostes(); }, []);

  // Buscar postes do banco de dados
  const buscarPostes = async () => {
    try {
      const { data, error } = await supabase.from('poles').select('*').order('code', { ascending: true });
      if (error) throw error;
      setPostes(data || []);
    } catch (erro) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os postes', variant: 'destructive' });
    } finally { setCarregando(false); }
  };

  // Abrir diálogo de criação (gera código automático)
  const abrirDialogoNovo = () => {
    setDadosFormulario({
      code: gerarProximoCodigo(postes),
      location_description: '', lighting_type: '' as any, power_watts: '',
      installation_date: '', lamp_lifespan_years: '3',
      maintenance_company: '', latitude: '', longitude: '',
    });
    setDialogAberto(true);
  };

  // Criar novo poste
  const criarPoste = async () => {
    if (!dadosFormulario.location_description || !dadosFormulario.lighting_type || !dadosFormulario.power_watts) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      // Garantir código único e sequencial no momento do salvamento
      const codigoFinal = gerarProximoCodigo(postes);
      const novoPoste: PosteInsercao = {
        code: codigoFinal, location_description: dadosFormulario.location_description,
        lighting_type: dadosFormulario.lighting_type, power_watts: parseInt(dadosFormulario.power_watts),
        installation_date: dadosFormulario.installation_date || null,
        lamp_lifespan_hours: anosParaHoras(parseFloat(dadosFormulario.lamp_lifespan_years) || 3),
        maintenance_company: dadosFormulario.maintenance_company || null,
        latitude: dadosFormulario.latitude ? parseFloat(dadosFormulario.latitude) : null,
        longitude: dadosFormulario.longitude ? parseFloat(dadosFormulario.longitude) : null,
      };
      const { error } = await supabase.from('poles').insert(novoPoste);
      if (error) throw error;
      toast({ title: 'Poste cadastrado com sucesso', description: `Código: ${codigoFinal}` });
      setDialogAberto(false);
      buscarPostes();
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    } finally { setSalvando(false); }
  };

  // Editar poste existente
  const editarPoste = async () => {
    if (!posteEditando) return;
    setSalvando(true);
    try {
      const { error } = await supabase.from('poles').update({
        location_description: dadosFormulario.location_description,
        lighting_type: dadosFormulario.lighting_type, power_watts: parseInt(dadosFormulario.power_watts),
        lamp_lifespan_hours: anosParaHoras(parseFloat(dadosFormulario.lamp_lifespan_years) || 3),
        maintenance_company: dadosFormulario.maintenance_company || null,
        latitude: dadosFormulario.latitude ? parseFloat(dadosFormulario.latitude) : null,
        longitude: dadosFormulario.longitude ? parseFloat(dadosFormulario.longitude) : null,
      }).eq('id', posteEditando.id);
      if (error) throw error;
      toast({ title: 'Poste atualizado com sucesso' });
      setDialogEdicaoAberto(false);
      setPosteEditando(null);
      buscarPostes();
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    } finally { setSalvando(false); }
  };

  // Alterar status do poste
  const alterarStatus = async (idPoste: string, novoStatus: string) => {
    try {
      const { error } = await supabase.from('poles').update({ status: novoStatus as any }).eq('id', idPoste);
      if (error) throw error;
      toast({ title: `Status atualizado para ${configStatus[novoStatus]?.rotulo}` });
      buscarPostes();
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    }
  };

  // Excluir poste
  const excluirPoste = async (idPoste: string) => {
    try {
      const { error } = await supabase.from('poles').delete().eq('id', idPoste);
      if (error) throw error;
      toast({ title: 'Poste removido com sucesso' });
      buscarPostes();
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    }
  };

  // Abrir diálogo de edição
  const abrirDialogoEdicao = (poste: Poste) => {
    setPosteEditando(poste);
    setDadosFormulario({
      code: poste.code, location_description: poste.location_description,
      lighting_type: poste.lighting_type, power_watts: poste.power_watts.toString(),
      installation_date: poste.installation_date || '',
      lamp_lifespan_years: horasParaAnos(poste.lamp_lifespan_hours).toString(),
      maintenance_company: poste.maintenance_company || '',
      latitude: poste.latitude?.toString() || '', longitude: poste.longitude?.toString() || '',
    });
    setDialogEdicaoAberto(true);
  };

  // Filtrar postes
  const postesFiltrados = postes.filter(poste => {
    const correspondeABusca = poste.code.toLowerCase().includes(termoBusca.toLowerCase()) || poste.location_description.toLowerCase().includes(termoBusca.toLowerCase());
    const correspondeAoStatus = filtroStatus === 'all' || poste.status === filtroStatus;
    return correspondeABusca && correspondeAoStatus;
  });

  // Calcular percentual de vida útil da lâmpada
  const obterPercentualVidaUtil = (horas: number | null, vidaUtil: number | null) => {
    if (!vidaUtil || vidaUtil === 0) return 100;
    return Math.max(0, Math.round(((vidaUtil - (horas || 0)) / vidaUtil) * 100));
  };

  if (carregando) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Campos do formulário de poste
  const camposFormularioPoste = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Código do Poste *</Label>
          <Input placeholder="Ex: P-001" value={dadosFormulario.code} onChange={(e) => setDadosFormulario({ ...dadosFormulario, code: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Tipo de Iluminação *</Label>
          <Select value={dadosFormulario.lighting_type} onValueChange={(v) => setDadosFormulario({ ...dadosFormulario, lighting_type: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{Object.entries(tiposIluminacao).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Localização *</Label>
        <Input placeholder="Ex: Entrada Principal, Bloco A" value={dadosFormulario.location_description} onChange={(e) => setDadosFormulario({ ...dadosFormulario, location_description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Código do Poste</Label>
          <Input value={dadosFormulario.code} readOnly disabled className="font-mono" />
          <p className="text-xs text-muted-foreground">Gerado automaticamente</p>
        </div>
        <div className="space-y-2">
          <Label>Tipo de Iluminação *</Label>
          <Select value={dadosFormulario.lighting_type} onValueChange={(v) => setDadosFormulario({ ...dadosFormulario, lighting_type: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{Object.entries(tiposIluminacao).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Localização *</Label>
        <Input placeholder="Ex: Entrada Principal, Bloco A" value={dadosFormulario.location_description} onChange={(e) => setDadosFormulario({ ...dadosFormulario, location_description: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Potência (W) *</Label>
          <Input type="number" placeholder="Ex: 100" value={dadosFormulario.power_watts} onChange={(e) => setDadosFormulario({ ...dadosFormulario, power_watts: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Vida Útil (anos) *</Label>
          <Input type="number" step="0.5" min="0.5" placeholder="3" value={dadosFormulario.lamp_lifespan_years} onChange={(e) => setDadosFormulario({ ...dadosFormulario, lamp_lifespan_years: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Empresa de Manutenção</Label>
          <Input placeholder="Nome" value={dadosFormulario.maintenance_company} onChange={(e) => setDadosFormulario({ ...dadosFormulario, maintenance_company: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Latitude</Label>
          <Input type="number" step="any" placeholder="-23.5505" value={dadosFormulario.latitude} onChange={(e) => setDadosFormulario({ ...dadosFormulario, latitude: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Longitude</Label>
          <Input type="number" step="any" placeholder="-46.6333" value={dadosFormulario.longitude} onChange={(e) => setDadosFormulario({ ...dadosFormulario, longitude: e.target.value })} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
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
            <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2 shadow-md" onClick={abrirDialogoNovo}><Plus className="h-4 w-4" />Novo Poste</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Poste</DialogTitle>
                  <DialogDescription>Preencha as informações do novo poste de iluminação</DialogDescription>
                </DialogHeader>
                {camposFormularioPoste}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
                  <Button onClick={criarPoste} disabled={salvando}>
                    {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por código ou localização..." className="pl-10" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(configStatus).map(([v, c]) => (<SelectItem key={v} value={v}>{c.rotulo}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lamp className="h-5 w-5 text-primary" />Lista de Postes</CardTitle>
          <CardDescription>{postesFiltrados.length} postes encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {postesFiltrados.length > 0 ? (
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
                  {postesFiltrados.map((poste) => {
                    const status = configStatus[poste.status || 'funcionando'];
                    const IconeStatus = status.icone;
                    const saude = obterPercentualVidaUtil(poste.current_lamp_hours, poste.lamp_lifespan_hours);
                    return (
                      <TableRow key={poste.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Lamp className="h-4 w-4" /></div>
                            <span className="font-medium">{poste.code}</span>
                          </div>
                        </TableCell>
                        <TableCell><div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{poste.location_description}</div></TableCell>
                        <TableCell><Badge variant="outline" className="bg-accent/50">{tiposIluminacao[poste.lighting_type] || poste.lighting_type}</Badge></TableCell>
                        <TableCell><div className="flex items-center gap-1"><Zap className="h-4 w-4 text-amber-500" />{poste.power_watts}W</div></TableCell>
                        <TableCell><Badge variant="outline" className={cn(status.cor)}><IconeStatus className="mr-1 h-3 w-3" />{status.rotulo}</Badge></TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Restante</span>
                              <span className={cn("font-medium", saude > 50 ? "text-emerald-600" : saude > 20 ? "text-amber-600" : "text-red-600")}>{saude}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", saude > 50 ? "bg-emerald-500" : saude > 20 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${saude}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => abrirDialogoEdicao(poste)}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {Object.entries(configStatus).filter(([k]) => k !== poste.status).map(([k, v]) => (
                                <DropdownMenuItem key={k} onClick={() => alterarStatus(poste.id, k)}>
                                  <v.icone className="h-3.5 w-3.5 mr-2" />{v.rotulo}
                                </DropdownMenuItem>
                              ))}
                              {isSindico && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => excluirPoste(poste.id)}>
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
                <Button className="mt-4" onClick={() => setDialogAberto(true)}><Plus className="h-4 w-4 mr-2" />Cadastrar primeiro poste</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Edição */}
      <Dialog open={dialogEdicaoAberto} onOpenChange={setDialogEdicaoAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Poste</DialogTitle>
            <DialogDescription>Atualize as informações do poste {posteEditando?.code}</DialogDescription>
          </DialogHeader>
          {camposFormularioPoste}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEdicaoAberto(false)}>Cancelar</Button>
            <Button onClick={editarPoste} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
