import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/cartao';
import { Button } from '@/components/ui/botao';
import { Input } from '@/components/ui/entrada';
import { Badge } from '@/components/ui/etiqueta';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/tabela';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/selecao';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialogo';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/abas';
import {
  History, Search, Download, Loader2, CheckCircle2, XCircle, Calendar,
  Eye, AlertTriangle, Wrench, LayoutList,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Ocorrencia = {
  id: string;
  failure_type: string;
  description: string;
  priority: string | null;
  status: string | null;
  created_at: string | null;
  completed_date: string | null;
  scheduled_date: string | null;
  resolution_notes: string | null;
  cost: number | null;
  poles: { code: string; location_description: string } | null;
};

const tiposFalha: Record<string, string> = {
  lampada_queimada: 'Lâmpada Queimada',
  curto_circuito: 'Curto-Circuito',
  oscilacao: 'Oscilação',
  fiacao_danificada: 'Fiação Danificada',
  poste_danificado: 'Poste Danificado',
  outros: 'Outros',
};

const configPrioridade: Record<string, { rotulo: string; cor: string }> = {
  baixa: { rotulo: 'Baixa', cor: 'bg-slate-100 text-slate-600' },
  media: { rotulo: 'Média', cor: 'bg-amber-100 text-amber-700' },
  alta: { rotulo: 'Alta', cor: 'bg-orange-100 text-orange-700' },
  urgente: { rotulo: 'Urgente', cor: 'bg-red-100 text-red-700' },
};

const formatarData = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

const formatarDataHora = (d: string | null) =>
  d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const diasEntre = (inicio: string | null, fim: string | null) => {
  if (!inicio || !fim) return '-';
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  const dias = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  return `${dias} dia${dias === 1 ? '' : 's'}`;
};

type CategoriaHistorico = 'geral' | 'avaria' | 'manutencao';

const rotuloCategoria: Record<CategoriaHistorico, string> = {
  geral: 'Histórico Geral',
  avaria: 'Avarias Resolvidas',
  manutencao: 'Manutenções Concluídas',
};

// Tipos de falha considerados "avaria" (relatadas como problema/quebra)
const TIPOS_AVARIA = new Set([
  'lampada_queimada', 'curto_circuito', 'oscilacao',
  'fiacao_danificada', 'poste_danificado',
]);

export default function Historico() {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<Ocorrencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroResultado, setFiltroResultado] = useState<string>('all');
  const [categoria, setCategoria] = useState<CategoriaHistorico>('geral');
  const [registroVisualizando, setRegistroVisualizando] = useState<Ocorrencia | null>(null);

  useEffect(() => {
    buscarHistorico();
  }, []);

  const buscarHistorico = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenances')
        .select('id, failure_type, description, priority, status, created_at, completed_date, scheduled_date, resolution_notes, cost, poles(code, location_description)')
        .in('status', ['concluido', 'cancelado'])
        .order('completed_date', { ascending: false });
      if (error) throw error;
      setRegistros((data as unknown as Ocorrencia[]) || []);
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  };

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      const busca = termoBusca.toLowerCase();
      const correspondeBusca =
        !busca ||
        r.poles?.code?.toLowerCase().includes(busca) ||
        r.poles?.location_description?.toLowerCase().includes(busca) ||
        r.description.toLowerCase().includes(busca) ||
        (tiposFalha[r.failure_type] || r.failure_type).toLowerCase().includes(busca);
      const correspondeResultado = filtroResultado === 'all' || r.status === filtroResultado;
      const correspondeCategoria =
        categoria === 'geral' ||
        (categoria === 'avaria' && TIPOS_AVARIA.has(r.failure_type)) ||
        (categoria === 'manutencao' && !TIPOS_AVARIA.has(r.failure_type));
      return correspondeBusca && correspondeResultado && correspondeCategoria;
    });
  }, [registros, termoBusca, filtroResultado, categoria]);

  const totalConcluidas = registrosFiltrados.filter((r) => r.status === 'concluido').length;
  const totalCanceladas = registrosFiltrados.filter((r) => r.status === 'cancelado').length;
  const custoTotal = registrosFiltrados.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);

  const baixarPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const larguraPagina = doc.internal.pageSize.getWidth();

      // Cabeçalho
      doc.setFillColor(249, 115, 22);
      doc.rect(0, 0, larguraPagina, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`PosteGuard — ${rotuloCategoria[categoria]}`, 14, 14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, larguraPagina - 14, 14, { align: 'right' });

      // Resumo
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.text(
        `Total: ${registrosFiltrados.length}   |   Concluídas: ${registrosFiltrados.filter((r) => r.status === 'concluido').length}   |   Canceladas: ${registrosFiltrados.filter((r) => r.status === 'cancelado').length}`,
        14,
        30,
      );

      const linhas = registrosFiltrados.map((r) => [
        r.poles?.code || 'N/A',
        r.poles?.location_description || '-',
        tiposFalha[r.failure_type] || r.failure_type,
        configPrioridade[r.priority || 'media']?.rotulo || '-',
        r.status === 'concluido' ? 'Concluído' : 'Cancelado',
        formatarData(r.created_at),
        formatarData(r.completed_date),
        diasEntre(r.created_at, r.completed_date),
        r.resolution_notes || r.description || '-',
      ]);

      autoTable(doc, {
        startY: 36,
        head: [[
          'Poste', 'Localização', 'Tipo de Falha', 'Prioridade', 'Resultado',
          'Data Ocorrência', 'Data Resolução', 'Duração', 'Observações',
        ]],
        body: linhas,
        styles: { fontSize: 8, cellPadding: 2.5, valign: 'top' },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 40 },
          2: { cellWidth: 32 },
          3: { cellWidth: 20 },
          4: { cellWidth: 22 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
          7: { cellWidth: 18 },
          8: { cellWidth: 'auto' },
        },
        didDrawPage: () => {
          const pagina = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(
            `Página ${pagina}`,
            larguraPagina - 14,
            doc.internal.pageSize.getHeight() - 6,
            { align: 'right' },
          );
        },
      });

      const nomeArquivo = `historico-${categoria}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nomeArquivo);
      toast({ title: 'PDF gerado', description: nomeArquivo });
    } catch (erro: any) {
      toast({ title: 'Erro ao gerar PDF', description: erro.message, variant: 'destructive' });
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-2xl gradient-sunset p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20"><History className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">Histórico de Ocorrências</h1>
              <p className="text-white/80">Avarias, manutenções e registros gerais do condomínio</p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="gap-2 shadow-md"
            onClick={baixarPdf}
            disabled={registrosFiltrados.length === 0}
          >
            <Download className="h-4 w-4" />Baixar PDF
          </Button>
        </div>
      </div>

      {/* Abas de categoria */}
      <Tabs value={categoria} onValueChange={(v) => setCategoria(v as CategoriaHistorico)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="geral" className="gap-2 py-2">
            <LayoutList className="h-4 w-4" /> Geral
          </TabsTrigger>
          <TabsTrigger value="avaria" className="gap-2 py-2">
            <AlertTriangle className="h-4 w-4" /> Avarias
          </TabsTrigger>
          <TabsTrigger value="manutencao" className="gap-2 py-2">
            <Wrench className="h-4 w-4" /> Manutenções
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Concluídas</p>
              <p className="text-2xl font-bold">{totalConcluidas}</p>
            </div>
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Canceladas</p>
              <p className="text-2xl font-bold">{totalCanceladas}</p>
            </div>
            <div className="p-3 rounded-full bg-slate-500/10 text-slate-600">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Custo Total</p>
              <p className="text-2xl font-bold">
                {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por poste, localização, tipo ou descrição..."
                className="pl-10"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
              />
            </div>
            <Select value={filtroResultado} onValueChange={setFiltroResultado}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Resultado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="concluido">Concluídas</SelectItem>
                <SelectItem value="cancelado">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />{rotuloCategoria[categoria]}
          </CardTitle>
          <CardDescription>{registrosFiltrados.length} registro(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {registrosFiltrados.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Poste</TableHead>
                    <TableHead>Tipo de Falha</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Data da Ocorrência</TableHead>
                    <TableHead>Data da Resolução</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrosFiltrados.map((r) => {
                    const prioridade = configPrioridade[r.priority || 'media'];
                    const concluido = r.status === 'concluido';
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/50 align-top">
                        <TableCell>
                          <p className="font-medium">{r.poles?.code || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{r.poles?.location_description || ''}</p>
                        </TableCell>
                        <TableCell className="text-sm">{tiposFalha[r.failure_type] || r.failure_type}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(prioridade.cor)}>{prioridade.rotulo}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            concluido
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                              : 'bg-slate-500/10 text-slate-600 border-slate-200',
                          )}>
                            {concluido ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                            {concluido ? 'Concluído' : 'Cancelado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatarDataHora(r.created_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatarData(r.completed_date)}</TableCell>
                        <TableCell className="text-sm">{diasEntre(r.created_at, r.completed_date)}</TableCell>
                        <TableCell className="text-sm max-w-xs">
                          <p className="line-clamp-2">{r.resolution_notes || r.description}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() => setRegistroVisualizando(r)}
                          >
                            <Eye className="h-4 w-4" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum registro no histórico ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de visualização detalhada */}
      <Dialog open={!!registroVisualizando} onOpenChange={(o) => !o && setRegistroVisualizando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Detalhes da Ocorrência
            </DialogTitle>
            <DialogDescription>
              Visualize todas as informações antes de exportar.
            </DialogDescription>
          </DialogHeader>

          {registroVisualizando && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-4">
                <p className="text-xs uppercase text-muted-foreground">Poste</p>
                <p className="font-semibold text-base">{registroVisualizando.poles?.code || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">
                  {registroVisualizando.poles?.location_description || 'Sem localização registrada'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Tipo de Falha</p>
                  <p className="font-medium">
                    {tiposFalha[registroVisualizando.failure_type] || registroVisualizando.failure_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Prioridade</p>
                  <Badge variant="secondary" className={cn(configPrioridade[registroVisualizando.priority || 'media'].cor)}>
                    {configPrioridade[registroVisualizando.priority || 'media'].rotulo}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Resultado</p>
                  <Badge variant="outline" className={cn(
                    registroVisualizando.status === 'concluido'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                      : 'bg-slate-500/10 text-slate-600 border-slate-200',
                  )}>
                    {registroVisualizando.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Custo</p>
                  <p className="font-medium">
                    {registroVisualizando.cost
                      ? Number(registroVisualizando.cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Data da Ocorrência</p>
                  <p className="text-sm">{formatarDataHora(registroVisualizando.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Data da Resolução</p>
                  <p className="text-sm">{formatarData(registroVisualizando.completed_date)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase text-muted-foreground">Duração</p>
                  <p className="text-sm font-medium">
                    {diasEntre(registroVisualizando.created_at, registroVisualizando.completed_date)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Descrição da Avaria</p>
                <p className="text-sm bg-muted/30 rounded-md p-3 leading-relaxed">
                  {registroVisualizando.description || 'Sem descrição registrada.'}
                </p>
              </div>

              {registroVisualizando.resolution_notes && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Notas de Resolução</p>
                  <p className="text-sm bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3 leading-relaxed">
                    {registroVisualizando.resolution_notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setRegistroVisualizando(null)}>
                  Fechar
                </Button>
                <Button onClick={baixarPdf} className="gap-2">
                  <Download className="h-4 w-4" /> Baixar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}