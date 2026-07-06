import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { Button } from '@/components/ui/botao';
import { Alert, AlertDescription } from '@/components/ui/alerta';
import { Zap, Mail, Lock, AlertCircle, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles, KeyRound, X, User, Home, Phone } from 'lucide-react';
import { z } from 'zod';
import condoBg from '@/assets/condominio-bg.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/selecao';

const esquemaLogin = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const esquemaCadastro = z.object({
  nome: z.string().trim().min(3, 'Informe o seu nome completo').max(100),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  telefone: z.string().min(6, 'Informe um telefone válido'),
  bloco: z.string().min(1, 'Selecione o bloco/rua'),
  unidade: z.string().min(1, 'Selecione a sua casa/unidade'),
});

export default function Auth() {
  const { user, loading, signIn, isAdmin } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aba, setAba] = useState<'entrar' | 'cadastrar'>('entrar');

  const [dadosLogin, setDadosLogin] = useState({ email: '', senha: '' });
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [recuperando, setRecuperando] = useState(false);
  const [modoRecuperar, setModoRecuperar] = useState<'email' | 'admin'>('admin');
  const [pedidoRecuperar, setPedidoRecuperar] = useState({ nome: '', unidade: '' });

  const [cadastro, setCadastro] = useState({ nome: '', email: '', senha: '', telefone: '', bloco: '', unidade: '' });
  const [blocos, setBlocos] = useState<Array<{ id: string; name: string }>>([]);
  const [unidades, setUnidades] = useState<Array<{ id: string; number: string; block_id: string }>>([]);

  useEffect(() => {
    supabase.from('blocks').select('id,name').order('name').then(({ data }) => setBlocos((data || []) as any));
    supabase.from('units').select('id,number,block_id').order('number').then(({ data }) => setUnidades((data || []) as any));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={isAdmin ? '/dashboard' : '/inicio'} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    try {
      esquemaLogin.parse({ email: dadosLogin.email, senha: dadosLogin.senha });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErro(err.errors[0].message);
        return;
      }
    }

    setCarregando(true);
    const { error } = await signIn(dadosLogin.email, dadosLogin.senha);
    setCarregando(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErro('Email ou senha incorretos');
      } else if (error.message.includes('Email not confirmed')) {
        setErro('Por favor, confirme seu email antes de entrar');
      } else {
        setErro(error.message);
      }
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    try {
      esquemaCadastro.parse(cadastro);
    } catch (err) {
      if (err instanceof z.ZodError) { setErro(err.errors[0].message); return; }
    }
    setCarregando(true);
    const { error } = await supabase.auth.signUp({
      email: cadastro.email,
      password: cadastro.senha,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: cadastro.nome,
          phone: cadastro.telefone,
          requested_unit_id: cadastro.unidade,
        },
      },
    });
    setCarregando(false);
    if (error) { setErro(error.message); return; }
    toast.success('Cadastro enviado! Aguarde a aprovação da administração.');
    setAba('entrar');
    setCadastro({ nome: '', email: '', senha: '', telefone: '', bloco: '', unidade: '' });
  };

  const unidadesFiltradas = unidades.filter(u => !cadastro.bloco || u.block_id === cadastro.bloco);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <img
        src={condoBg}
        alt="Condomínio residencial"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-orange-950/80" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Painel lateral apresentação */}
        <div className="hidden lg:flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/40">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">PosteGuard</h2>
              <p className="text-xs text-white/60">Monitoramento Inteligente</p>
            </div>
          </div>

          <div className="space-y-8 max-w-md">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3 w-3 text-amber-300" />
                Plataforma profissional
              </span>
              <h1 className="mt-5 text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                Iluminação <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">sob controle</span> em tempo real.
              </h1>
              <p className="mt-4 text-white/70 text-lg leading-relaxed">
                Monitoramento, manutenção e suporte ao morador, tudo em uma única plataforma para o seu condomínio.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { titulo: 'Postes monitorados', valor: '24/24h' },
                { titulo: 'Tempo médio de resposta', valor: ' 5 min' },
                { titulo: 'Sensores funcionando ', valor: '24h' },
                { titulo: 'Histórico completo', valor: 'PDF' },
              ].map((item) => (
                <div key={item.titulo} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs text-white/60">{item.titulo}</p>
                  <p className="mt-1 text-xl font-bold text-white">{item.valor}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">© 2026 PosteGuard. Todos os direitos reservados.</p>
        </div>

        {/* Painel direito: login */}
        <div className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <div className="px-8 pt-10 pb-4 text-center lg:text-left">
                <div className="lg:hidden flex items-center justify-center gap-3 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {aba === 'entrar' ? 'Bem-vindo de volta' : 'Cadastro de morador'}
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  {aba === 'entrar' ? 'Acesse a sua conta para continuar.' : 'Informe os seus dados para solicitar acesso.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                  <button type="button" onClick={() => { setAba('entrar'); setErro(null); }}
                    className={`h-9 rounded-lg text-sm font-medium transition ${aba === 'entrar' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow' : 'text-white/60 hover:text-white'}`}>
                    Entrar
                  </button>
                  <button type="button" onClick={() => { setAba('cadastrar'); setErro(null); }}
                    className={`h-9 rounded-lg text-sm font-medium transition ${aba === 'cadastrar' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow' : 'text-white/60 hover:text-white'}`}>
                    Cadastrar
                  </button>
                </div>
              </div>

              <div className="px-8 pb-8">
                {erro && (
                  <Alert variant="destructive" className="mb-5 py-2.5 bg-red-500/10 border-red-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm text-red-200">{erro}</AlertDescription>
                  </Alert>
                )}

                {aba === 'entrar' && (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        autoComplete="email"
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400/60 transition-all text-sm"
                        value={dadosLogin.email}
                        onChange={(e) => setDadosLogin({ ...dadosLogin, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/80 mb-2 block">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        type={mostrarSenha ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full h-12 pl-11 pr-11 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400/60 transition-all text-sm"
                        value={dadosLogin.senha}
                        onChange={(e) => setDadosLogin({ ...dadosLogin, senha: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha(!mostrarSenha)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                      >
                        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={() => { setEmailRecuperar(dadosLogin.email); setMostrarRecuperar(true); }}
                      className="text-xs text-amber-300 hover:text-amber-200 font-medium transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 font-semibold rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg shadow-orange-500/30 border-0 transition-all duration-300"
                    disabled={carregando}
                  >
                    {carregando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {carregando ? 'Entrando...' : 'Entrar na minha conta'}
                  </Button>
                </form>
                )}

                {aba === 'cadastrar' && (
                  <form onSubmit={handleCadastro} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white/80 mb-2 block">Nome completo</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                          <input type="text" placeholder="Seu nome"
                            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60 text-sm"
                            value={cadastro.nome} onChange={(e) => setCadastro({ ...cadastro, nome: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-white/80 mb-2 block">Email</label>
                          <input type="email" placeholder="email"
                            className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60 text-sm"
                            value={cadastro.email} onChange={(e) => setCadastro({ ...cadastro, email: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-white/80 mb-2 block">Telefone</label>
                          <input type="tel" placeholder="+244 ..."
                            className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60 text-sm"
                            value={cadastro.telefone} onChange={(e) => setCadastro({ ...cadastro, telefone: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white/80 mb-2 block">Senha</label>
                        <input type="password" placeholder="Mínimo 6 caracteres"
                          className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60 text-sm"
                          value={cadastro.senha} onChange={(e) => setCadastro({ ...cadastro, senha: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-white/80 mb-2 block">Bloco / Rua</label>
                          <Select value={cadastro.bloco} onValueChange={(v) => setCadastro({ ...cadastro, bloco: v, unidade: '' })}>
                            <SelectTrigger className="h-11 bg-white/5 border-white/15 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {blocos.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-white/80 mb-2 block">Casa / Unidade</label>
                          <Select value={cadastro.unidade} onValueChange={(v) => setCadastro({ ...cadastro, unidade: v })} disabled={!cadastro.bloco}>
                            <SelectTrigger className="h-11 bg-white/5 border-white/15 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {unidadesFiltradas.map(u => <SelectItem key={u.id} value={u.id}>{u.number}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <Button type="submit" disabled={carregando}
                      className="w-full h-12 font-semibold rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg shadow-orange-500/30 border-0">
                      {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                      {carregando ? 'Enviando...' : 'Solicitar cadastro'}
                    </Button>
                    <p className="text-[11px] text-white/50 text-center">
                      A administração validará se você é morador do condomínio antes de liberar o acesso.
                    </p>
                  </form>
                )}

                <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3.5">
                  <ShieldCheck className="h-4 w-4 text-amber-300 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/70 leading-relaxed">
                    Todos os cadastros passam por aprovação da administração para garantir que apenas moradores tenham acesso.
                  </p>
                </div>
              </div>
            </div>

            <p className="lg:hidden text-center text-xs text-white/40 mt-6">
              © 2026 PosteGuard — Sistema de Monitoramento
            </p>
          </div>
        </div>
      </div>

      {mostrarRecuperar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl p-6 relative">
            <button
              onClick={() => setMostrarRecuperar(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Recuperar senha</h3>
                <p className="text-xs text-white/60">Escolha como recuperar o acesso</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-4">
              <button type="button" onClick={() => setModoRecuperar('admin')}
                className={`h-9 rounded-lg text-xs font-medium ${modoRecuperar === 'admin' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : 'text-white/60'}`}>
                Via administração
              </button>
              <button type="button" onClick={() => setModoRecuperar('email')}
                className={`h-9 rounded-lg text-xs font-medium ${modoRecuperar === 'email' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : 'text-white/60'}`}>
                Via email
              </button>
            </div>
            {modoRecuperar === 'email' ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!emailRecuperar) {
                  toast.error('Informe o seu email');
                  return;
                }
                setRecuperando(true);
                const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperar, {
                  redirectTo: `${window.location.origin}/redefinir-senha`,
                });
                setRecuperando(false);
                if (error) {
                  toast.error(error.message);
                  return;
                }
                toast.success('Email enviado! Verifique a sua caixa de entrada.');
                setMostrarRecuperar(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-white/80 mb-2 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    autoFocus
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60 text-sm"
                    value={emailRecuperar}
                    onChange={(e) => setEmailRecuperar(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={recuperando}
                className="w-full h-12 font-semibold rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg shadow-orange-500/30 border-0"
              >
                {recuperando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {recuperando ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
            </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!emailRecuperar || !pedidoRecuperar.nome) { toast.error('Preencha os campos'); return; }
                  setRecuperando(true);
                  const { error } = await supabase.from('password_reset_requests').insert({
                    email: emailRecuperar,
                    full_name: pedidoRecuperar.nome,
                    unit_number: pedidoRecuperar.unidade || null,
                  });
                  setRecuperando(false);
                  if (error) { toast.error(error.message); return; }
                  toast.success('Pedido enviado! A administração entrará em contato.');
                  setMostrarRecuperar(false);
                  setPedidoRecuperar({ nome: '', unidade: '' });
                }}
                className="space-y-3"
              >
                <p className="text-xs text-white/60">Como os emails do condomínio são internos, preencha os dados abaixo. A administração validará e definirá uma nova senha temporária.</p>
                <div>
                  <label className="text-xs font-medium text-white/80 mb-1 block">Email da conta</label>
                  <input type="email" className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                    value={emailRecuperar} onChange={(e) => setEmailRecuperar(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/80 mb-1 block">Nome completo</label>
                  <input type="text" className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                    value={pedidoRecuperar.nome} onChange={(e) => setPedidoRecuperar({ ...pedidoRecuperar, nome: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/80 mb-1 block">Nº da casa/unidade (opcional)</label>
                  <input type="text" className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                    value={pedidoRecuperar.unidade} onChange={(e) => setPedidoRecuperar({ ...pedidoRecuperar, unidade: e.target.value })} />
                </div>
                <Button type="submit" disabled={recuperando}
                  className="w-full h-11 font-semibold rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">
                  {recuperando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enviar pedido à administração
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
