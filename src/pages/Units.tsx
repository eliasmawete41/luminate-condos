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
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mockBlocks = [
  { id: '1', name: 'Bloco A', description: '10 andares, 40 apartamentos', units: 40 },
  { id: '2', name: 'Bloco B', description: '10 andares, 40 apartamentos', units: 40 },
  { id: '3', name: 'Bloco C', description: '8 andares, 32 apartamentos', units: 32 },
];

const mockUnits = [
  { id: '1', block: 'Bloco A', number: '101', floor: 1, status: 'ocupada', parkingSpots: 2, residents: 3 },
  { id: '2', block: 'Bloco A', number: '102', floor: 1, status: 'ocupada', parkingSpots: 1, residents: 2 },
  { id: '3', block: 'Bloco A', number: '103', floor: 1, status: 'alugada', parkingSpots: 1, residents: 1 },
  { id: '4', block: 'Bloco A', number: '104', floor: 1, status: 'vazia', parkingSpots: 2, residents: 0 },
  { id: '5', block: 'Bloco B', number: '201', floor: 2, status: 'ocupada', parkingSpots: 2, residents: 4 },
  { id: '6', block: 'Bloco B', number: '202', floor: 2, status: 'alugada', parkingSpots: 1, residents: 2 },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  ocupada: { label: 'Ocupada', color: 'bg-green-500/10 text-green-600 border-green-200' },
  vazia: { label: 'Vazia', color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
  alugada: { label: 'Alugada', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
};

export default function Units() {
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);

  const filteredUnits = mockUnits.filter(unit => {
    const matchesSearch = 
      unit.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.block.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBlock = blockFilter === 'all' || unit.block === blockFilter;
    const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
    return matchesSearch && matchesBlock && matchesStatus;
  });

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
                    <p className="text-2xl font-bold">{mockUnits.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Home className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = mockUnits.filter(u => u.status === key).length;
              return (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{config.label}</p>
                        <p className="text-2xl font-bold">{count}</p>
                      </div>
                      <Badge variant="outline" className={cn(config.color, "text-lg px-3 py-1")}>
                        {Math.round((count / mockUnits.length) * 100)}%
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
                      {mockBlocks.map(block => (
                        <SelectItem key={block.id} value={block.name}>{block.name}</SelectItem>
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
                          <Label>Bloco</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockBlocks.map(block => (
                                <SelectItem key={block.id} value={block.id}>{block.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Número</Label>
                          <Input placeholder="Ex: 101" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Andar</Label>
                          <Input type="number" placeholder="Ex: 1" />
                        </div>
                        <div className="space-y-2">
                          <Label>Vagas de Garagem</Label>
                          <Input type="number" placeholder="Ex: 2" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Situação</Label>
                        <Select>
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
                      <Button onClick={() => setIsUnitDialogOpen(false)}>
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Unidade</TableHead>
                      <TableHead>Bloco</TableHead>
                      <TableHead>Andar</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Moradores</TableHead>
                      <TableHead>Vagas</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnits.map((unit) => {
                      const status = statusConfig[unit.status];
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
                              {unit.block}
                            </div>
                          </TableCell>
                          <TableCell>{unit.floor}º</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(status.color)}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {unit.residents}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              {unit.parkingSpots}
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
                                <DropdownMenuItem className="text-destructive">
                                  Excluir
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
        </TabsContent>

        {/* Blocks Tab */}
        <TabsContent value="blocks" className="space-y-6">
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
                    <Label>Nome do Bloco</Label>
                    <Input placeholder="Ex: Bloco D" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input placeholder="Ex: 10 andares, 40 apartamentos" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsBlockDialogOpen(false)}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {mockBlocks.map(block => (
              <Card key={block.id} className="hover:shadow-md transition-shadow cursor-pointer">
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
                        <DropdownMenuItem className="text-destructive">
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>{block.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total de unidades</span>
                    <Badge variant="secondary">{block.units}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
