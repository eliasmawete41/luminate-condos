import { useState } from 'react';
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
  Wrench,
  Calendar,
  Clock,
  User,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  Timer,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mockMaintenances = [
  { 
    id: '1', 
    poleCode: 'P-003', 
    poleLocation: 'Jardim Bloco A',
    failureType: 'lampada_queimada',
    description: 'Lâmpada não acende desde ontem à noite',
    priority: 'alta',
    status: 'aberto',
    reportedBy: 'Maria Silva',
    assignedTo: null,
    createdAt: '2024-01-20T10:30:00',
    scheduledDate: null
  },
  { 
    id: '2', 
    poleCode: 'P-004', 
    poleLocation: 'Playground',
    failureType: 'oscilacao',
    description: 'Luz oscilando intermitentemente',
    priority: 'media',
    status: 'em_andamento',
    reportedBy: 'João Santos',
    assignedTo: 'Carlos Técnico',
    createdAt: '2024-01-19T14:00:00',
    scheduledDate: '2024-01-22'
  },
  { 
    id: '3', 
    poleCode: 'P-008', 
    poleLocation: 'Estacionamento C',
    failureType: 'curto_circuito',
    description: 'Poste desarmou o disjuntor',
    priority: 'urgente',
    status: 'concluido',
    reportedBy: 'Ana Costa',
    assignedTo: 'Carlos Técnico',
    createdAt: '2024-01-18T08:15:00',
    scheduledDate: '2024-01-19'
  },
  { 
    id: '4', 
    poleCode: 'P-012', 
    poleLocation: 'Portaria Sul',
    failureType: 'lampada_queimada',
    description: 'Necessita troca preventiva',
    priority: 'baixa',
    status: 'aberto',
    reportedBy: 'Sistema',
    assignedTo: null,
    createdAt: '2024-01-17T16:45:00',
    scheduledDate: null
  },
];

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  aberto: { label: 'Aberto', icon: AlertCircle, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  em_andamento: { label: 'Em Andamento', icon: Timer, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  concluido: { label: 'Concluído', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600 border-green-200' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
  media: { label: 'Média', color: 'bg-amber-100 text-amber-700' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const failureTypes: Record<string, string> = {
  lampada_queimada: 'Lâmpada Queimada',
  curto_circuito: 'Curto-Circuito',
  oscilacao: 'Oscilação',
  fiacao_danificada: 'Fiação Danificada',
  poste_danificado: 'Poste Danificado',
  outros: 'Outros',
};

export default function Maintenances() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredMaintenances = mockMaintenances.filter(m => {
    const matchesSearch = 
      m.poleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.poleLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || m.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manutenções</h1>
          <p className="text-muted-foreground">
            Acompanhamento de chamados e ocorrências
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Ocorrência
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Nova Ocorrência</DialogTitle>
              <DialogDescription>
                Preencha as informações para abrir um chamado de manutenção
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pole">Poste</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o poste" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P-001">P-001 - Entrada Principal</SelectItem>
                      <SelectItem value="P-002">P-002 - Estacionamento A</SelectItem>
                      <SelectItem value="P-003">P-003 - Jardim Bloco A</SelectItem>
                      <SelectItem value="P-004">P-004 - Playground</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="failureType">Tipo de Falha</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(failureTypes).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Data Agendada (opcional)</Label>
                  <Input id="scheduledDate" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição do Problema</Label>
                <Textarea 
                  id="description" 
                  placeholder="Descreva detalhadamente o problema observado..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>
                Registrar Ocorrência
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = mockMaintenances.filter(m => m.status === key).length;
          const StatusIcon = config.icon;
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(key)}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <div className={cn("p-3 rounded-full", config.color)}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
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
              <Input
                placeholder="Buscar por poste, localização ou descrição..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
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
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(priorityConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
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
            <Wrench className="h-5 w-5 text-primary" />
            Lista de Ocorrências
          </CardTitle>
          <CardDescription>
            {filteredMaintenances.length} ocorrências encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Poste</TableHead>
                  <TableHead>Tipo de Falha</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaintenances.map((maintenance) => {
                  const status = statusConfig[maintenance.status];
                  const priority = priorityConfig[maintenance.priority];
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={maintenance.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{maintenance.poleCode}</p>
                          <p className="text-sm text-muted-foreground">{maintenance.poleLocation}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {failureTypes[maintenance.failureType]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn(priority.color)}>
                          {priority.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(status.color)}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {maintenance.assignedTo || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatDate(maintenance.createdAt)}
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
                            <DropdownMenuItem>Atribuir técnico</DropdownMenuItem>
                            <DropdownMenuItem>Atualizar status</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Cancelar
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
        </CardContent>
      </Card>
    </div>
  );
}
