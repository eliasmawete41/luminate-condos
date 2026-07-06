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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/selecao';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search, Users as IconeUsuarios, Mail, Phone, MoreHorizontal,
  Shield, UserCheck, Loader2, Plus, UserPlus, Wrench, Trash2, Clock, Check, X, KeyRound
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/menu-suspenso';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/ContextoAutenticacao';

// Interface de usuário com papel
interface UsuarioComPapel {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  papeis: string[];
}

// Configuração dos papéis
const configPapeis: Record<string, { rotulo: string; cor: string; icone: React.ElementType }> = {
  admin: { rotulo: 'Administrador', cor: 'bg-purple-500/10 text-purple-600 border-purple-200', icone: Shield },
  morador: { rotulo: 'Morador', cor: 'bg-green-500/10 text-green-600 border-green-200', icone: UserCheck },
  manutencao: { rotulo: 'Técnico', cor: 'bg-amber-500/10 text-amber-600 border-amber-200', icone: Wrench },
};

export default function Usuarios() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioComPapel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState<string>('all');
  const [dialogCriacaoAberto, setDialogCriacaoAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    full_name: '', email: '', password: '', phone: '', role: 'morador',
  });
  const [pendentes, setPendentes] = useState<Array<{ id: string; full_name: string; email: string; phone: string | null; requested_unit_id: string | null; unit_number?: string; block_name?: string }>>([]);
  const [pedidosSenha, setPedidosSenha] = useState<Array<{ id: string; email: string; full_name: string; unit_number: string | null; created_at: string; status: string }>>([]);
  const [resetDialog, setResetDialog] = useState<{ open: boolean; requestId: string | null; senha: string }>({ open: false, requestId: null, senha: '' });
  const [processando, setProcessando] = useState(false);

  useEffect(() => { buscarUsuarios(); buscarPendentes(); buscarPedidosSenha(); }, []);

  const buscarPendentes = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, requested_unit_id, units:requested_unit_id(number, blocks:block_id(name))')
      .eq('status', 'pendente');
    setPendentes((data || []).map((p: any) => ({
      id: p.id, full_name: p.full_name, email: p.email, phone: p.phone,
      requested_unit_id: p.requested_unit_id,
      unit_number: p.units?.number,
      block_name: p.units?.blocks?.name,
    })));
  };

  const buscarPedidosSenha = async () => {
    const { data } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });
    setPedidosSenha((data || []) as any);
  };

  const aprovarMorador = async (userId: string) => {
    setProcessando(true);
    const { error } = await supabase.rpc('approve_resident', { _user_id: userId });
    setProcessando(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Morador aprovado' });
    buscarPendentes(); buscarUsuarios();
  };

  const rejeitarMorador = async (userId: string) => {
    const motivo = prompt('Motivo da rejeição (opcional):') || 'Cadastro não aprovado';
    setProcessando(true);
    const { error } = await supabase.rpc('reject_resident', { _user_id: userId, _reason: motivo });
    setProcessando(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Cadastro rejeitado' });
    buscarPendentes();
  };

  const aprovarPedidoSenha = async () => {
    if (!resetDialog.requestId || resetDialog.senha.length < 6) {
      toast({ title: 'Senha mínima de 6 caracteres', variant: 'destructive' }); return;
    }
    setProcessando(true);
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { request_id: resetDialog.requestId, new_password: resetDialog.senha },
    });
    setProcessando(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Erro', description: (error?.message || (data as any)?.error), variant: 'destructive' });
      return;
    }
    toast({ title: 'Senha redefinida', description: 'Comunique a nova senha ao morador.' });
    setResetDialog({ open: false, requestId: null, senha: '' });
    buscarPedidosSenha();
  };

  // Buscar todos os usuários com seus papéis
  const buscarUsuarios = async () => {
    try {
      const { data: perfis, error: erroPerfis } = await supabase
        .from('profiles').select('*').order('full_name');
      if (erroPerfis) throw erroPerfis;

      const { data: papeis, error: erroPapeis } = await supabase
        .from('user_roles').select('user_id, role');
      if (erroPapeis) throw erroPapeis;

      const mapaPapeis: Record<string, string[]> = {};
      papeis?.forEach(p => {
        if (!mapaPapeis[p.user_id]) mapaPapeis[p.user_id] = [];
        mapaPapeis[p.user_id].push(p.role);
      });

      setUsuarios((perfis || []).map(p => ({
        id: p.id, nome_completo: p.full_name, email: p.email,
        telefone: p.phone, avatar_url: p.avatar_url,
        papeis: mapaPapeis[p.id] || ['morador'],
      })));
    } catch (erro) {
      console.error('Erro:', erro);
      toast({ title: 'Erro', description: 'Não foi possível carregar os usuários', variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  };

  // Criar novo usuário
  const criarUsuario = async () => {
    if (!novoUsuario.full_name || !novoUsuario.email || !novoUsuario.password || !novoUsuario.role) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setCriando(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: novoUsuario.email,
          password: novoUsuario.password,
          full_name: novoUsuario.full_name,
          phone: novoUsuario.phone || null,
          role: novoUsuario.role,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Usuário criado com sucesso!' });
      setDialogCriacaoAberto(false);
      setNovoUsuario({ full_name: '', email: '', password: '', phone: '', role: 'morador' });
      buscarUsuarios();
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    } finally {
      setCriando(false);
    }
  };

  // Alterar papel do usuário
  const alterarPapel = async (idUsuario: string, novoPapel: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: novoPapel as any })
        .eq('user_id', idUsuario);
      if (error) throw error;
      toast({ title: `Perfil atualizado para ${configPapeis[novoPapel]?.rotulo}` });
      buscarUsuarios();
    } catch (erro: any) {
      toast({ title: 'Erro', description: erro.message, variant: 'destructive' });
    }
  };

  // Filtrar usuários
  const usuariosFiltrados = usuarios.filter(usuario => {
    const correspondeABusca =
      usuario.nome_completo.toLowerCase().includes(termoBusca.toLowerCase()) ||
      usuario.email.toLowerCase().includes(termoBusca.toLowerCase());
    const correspondeAoPapel = filtroPapel === 'all' || usuario.papeis.includes(filtroPapel);
    return correspondeABusca && correspondeAoPapel;
  });

  // Contagem por papel
  const obterContagemPapeis = () => {
    const contagem: Record<string, number> = {};
    usuarios.forEach(u => u.papeis.forEach(papel => { contagem[papel] = (contagem[papel] || 0) + 1; }));
    return contagem;
  };
  const contagemPapeis = obterContagemPapeis();

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
            <div className="p-2 rounded-xl bg-white/20">
              <IconeUsuarios className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">Usuários</h1>
              <p className="text-white/80">Gestão de moradores, técnicos e administradores</p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={dialogCriacaoAberto} onOpenChange={setDialogCriacaoAberto}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2 shadow-md">
                  <UserPlus className="h-4 w-4" />
                  Cadastrar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Crie uma conta para técnicos, síndicos ou outros administradores
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input placeholder="Nome do usuário"
                        value={novoUsuario.full_name}
                        onChange={(e) => setNovoUsuario({ ...novoUsuario, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Perfil *</Label>
                      <Select value={novoUsuario.role} onValueChange={(v) => setNovoUsuario({ ...novoUsuario, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(configPapeis).map(([valor, config]) => (
                            <SelectItem key={valor} value={valor}>{config.rotulo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="email@exemplo.com"
                      value={novoUsuario.email}
                      onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Senha *</Label>
                      <Input type="password" placeholder="Mínimo 6 caracteres"
                        value={novoUsuario.password}
                        onChange={(e) => setNovoUsuario({ ...novoUsuario, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000"
                        value={novoUsuario.phone}
                        onChange={(e) => setNovoUsuario({ ...novoUsuario, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogCriacaoAberto(false)}>Cancelar</Button>
                  <Button onClick={criarUsuario} disabled={criando} className="gap-2">
                    {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isAdmin && pendentes.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Cadastros Pendentes de Aprovação
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">{pendentes.length}</Badge>
            </CardTitle>
            <CardDescription>Novos moradores aguardando validação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {pendentes.map(p => (
                <div key={p.id} className="p-4 rounded-lg border bg-card flex flex-col gap-3">
                  <div>
                    <p className="font-semibold">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                    {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                    <p className="text-xs mt-1"><span className="text-muted-foreground">Unidade:</span> <span className="font-medium">{p.block_name || '—'} / {p.unit_number || '—'}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => aprovarMorador(p.id)} disabled={processando} className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700">
                      <Check className="h-4 w-4" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejeitarMorador(p.id)} disabled={processando} className="flex-1 gap-1">
                      <X className="h-4 w-4" /> Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && pedidosSenha.length > 0 && (
        <Card className="border-sky-500/40 bg-sky-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-sky-600" />
              Pedidos de Recuperação de Senha
              <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30">{pedidosSenha.length}</Badge>
            </CardTitle>
            <CardDescription>Defina uma nova senha temporária e comunique ao morador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {pedidosSenha.map(r => (
                <div key={r.id} className="p-4 rounded-lg border bg-card flex flex-col gap-3">
                  <div>
                    <p className="font-semibold">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                    {r.unit_number && <p className="text-xs text-muted-foreground">Unidade: {r.unit_number}</p>}
                  </div>
                  <Button size="sm" onClick={() => setResetDialog({ open: true, requestId: r.id, senha: '' })} className="gap-1">
                    <KeyRound className="h-4 w-4" /> Definir nova senha
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={resetDialog.open} onOpenChange={(o) => setResetDialog({ ...resetDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir nova senha temporária</DialogTitle>
            <DialogDescription>O morador deverá alterar a senha após o próximo login.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Nova senha</Label>
            <Input type="text" value={resetDialog.senha} onChange={(e) => setResetDialog({ ...resetDialog, senha: e.target.value })} placeholder="Mínimo 6 caracteres" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog({ open: false, requestId: null, senha: '' })}>Cancelar</Button>
            <Button onClick={aprovarPedidoSenha} disabled={processando} className="gap-2">
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{usuarios.length}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <IconeUsuarios className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        {Object.entries(configPapeis).slice(0, 4).map(([chave, config]) => {
          const contagem = contagemPapeis[chave] || 0;
          const IconePapel = config.icone;
          return (
            <Card key={chave}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{config.rotulo}</p>
                    <p className="text-2xl font-bold">{contagem}</p>
                  </div>
                  <Badge variant="outline" className={cn(config.cor)}>
                    <IconePapel className="h-4 w-4" />
                  </Badge>
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
              <Input placeholder="Buscar por nome ou email..." className="pl-10"
                value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} />
            </div>
            <Select value={filtroPapel} onValueChange={setFiltroPapel}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Perfil" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(configPapeis).map(([valor, config]) => (
                  <SelectItem key={valor} value={valor}>{config.rotulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconeUsuarios className="h-5 w-5 text-primary" />
            Lista de Usuários
          </CardTitle>
          <CardDescription>{usuariosFiltrados.length} usuários encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {usuariosFiltrados.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map((usuario) => {
                    const papelPrincipal = usuario.papeis[0] || 'morador';
                    const papel = configPapeis[papelPrincipal] || configPapeis.morador;
                    return (
                      <TableRow key={usuario.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={usuario.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {usuario.nome_completo.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{usuario.nome_completo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {usuario.email}
                            </div>
                            {usuario.telefone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />{usuario.telefone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {usuario.papeis.map(p => {
                              const infoPapel = configPapeis[p] || configPapeis.morador;
                              return (
                                <Badge key={p} variant="outline" className={cn(infoPapel.cor)}>
                                  {infoPapel.rotulo}
                                </Badge>
                              );
                            })}
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
                              {isAdmin && (
                                <>
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Alterar Perfil</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      {Object.entries(configPapeis).map(([chavePapel, config]) => (
                                        <DropdownMenuItem
                                          key={chavePapel}
                                          onClick={() => alterarPapel(usuario.id, chavePapel)}
                                          disabled={usuario.papeis.includes(chavePapel)}
                                        >
                                          {config.rotulo}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => {
                                navigator.clipboard.writeText(usuario.email);
                                toast({ title: 'Email copiado!' });
                              }}>
                                Copiar Email
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
              <IconeUsuarios className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
