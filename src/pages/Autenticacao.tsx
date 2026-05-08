import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Mail, Lock, User, AlertCircle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import condoBg from '@/assets/condominio-bg.png';

const esquemaLogin = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const esquemaCadastro = z.object({
  nomeCompleto: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmarSenha: z.string(),
}).refine(dados => dados.senha === dados.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
});

export default function Auth() {
  const { user, loading, signIn, signUp, isSindico } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [modoAtivo, setModoAtivo] = useState<'login' | 'cadastro'>('login');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const [dadosLogin, setDadosLogin] = useState({ email: '', senha: '' });
  const [dadosCadastro, setDadosCadastro] = useState({
    nomeCompleto: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={isSindico ? '/dashboard' : '/inicio'} replace />;
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
    setSucesso(null);

    try {
      esquemaCadastro.parse({
        nomeCompleto: dadosCadastro.nomeCompleto,
        email: dadosCadastro.email,
        senha: dadosCadastro.senha,
        confirmarSenha: dadosCadastro.confirmarSenha,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErro(err.errors[0].message);
        return;
      }
    }

    setCarregando(true);
    const { error } = await signUp(dadosCadastro.email, dadosCadastro.senha, dadosCadastro.nomeCompleto);
    setCarregando(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setErro('Este email já está cadastrado');
      } else {
        setErro(error.message);
      }
    } else {
      setSucesso('Cadastro realizado com sucesso! Você já pode fazer login.');
      setDadosCadastro({ nomeCompleto: '', email: '', senha: '', confirmarSenha: '' });
    }
  };

  const alternarModo = (modo: 'login' | 'cadastro') => {
    setModoAtivo(modo);
    setErro(null);
    setSucesso(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Imagem de fundo cobrindo tudo */}
      <img
        src={condoBg}
        alt="Condomínio residencial"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Sobreposição escura com gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70" />

      {/* Conteúdo principal */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Card de autenticação com vidro fosco */}
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Cabeçalho com logo e título */}
            <div className="px-8 pt-8 pb-4 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">PosteGuard</h1>
              <p className="text-sm text-white/50 mt-1">Sistema de Monitoramento Inteligente</p>
            </div>

            {/* Abas */}
            <div className="px-8 pb-2">
              <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
                <button
                  type="button"
                  onClick={() => alternarModo('login')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                    modoAtivo === 'login'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/25'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => alternarModo('cadastro')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                    modoAtivo === 'cadastro'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/25'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Cadastrar
                </button>
              </div>
            </div>

            {/* Corpo do formulário */}
            <div className="px-8 pb-8 pt-4">
              {/* Alertas */}
              {erro && (
                <Alert variant="destructive" className="mb-4 py-2.5 bg-red-500/10 border-red-500/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm text-red-300">{erro}</AlertDescription>
                </Alert>
              )}

              {sucesso && (
                <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/10 py-2.5">
                  <AlertDescription className="text-sm text-emerald-300">{sucesso}</AlertDescription>
                </Alert>
              )}

              {/* Formulário de Login */}
              {modoAtivo === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all text-sm"
                        value={dadosLogin.email}
                        onChange={(e) => setDadosLogin({ ...dadosLogin, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/70 mb-1.5 block">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type={mostrarSenha ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full h-11 pl-11 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all text-sm"
                        value={dadosLogin.senha}
                        onChange={(e) => setDadosLogin({ ...dadosLogin, senha: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha(!mostrarSenha)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25 border-0 transition-all duration-300"
                    disabled={carregando}
                  >
                    {carregando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {carregando ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              )}

              {/* Formulário de Cadastro */}
              {modoAtivo === 'cadastro' && (
                <form onSubmit={handleCadastro} className="space-y-3.5">
                  <p className="text-xs text-white/40 -mt-1 mb-1">Cadastro para moradores do condomínio</p>

                  <div>
                    <label className="text-sm font-medium text-white/70 mb-1.5 block">Nome completo</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        placeholder="Seu nome"
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all text-sm"
                        value={dadosCadastro.nomeCompleto}
                        onChange={(e) => setDadosCadastro({ ...dadosCadastro, nomeCompleto: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/70 mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all text-sm"
                        value={dadosCadastro.email}
                        onChange={(e) => setDadosCadastro({ ...dadosCadastro, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/70 mb-1.5 block">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type={mostrarSenha ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full h-11 pl-11 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all text-sm"
                        value={dadosCadastro.senha}
                        onChange={(e) => setDadosCadastro({ ...dadosCadastro, senha: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha(!mostrarSenha)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/70 mb-1.5 block">Confirmar senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                      <input
                        type={mostrarConfirmarSenha ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full h-11 pl-11 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all text-sm"
                        value={dadosCadastro.confirmarSenha}
                        onChange={(e) => setDadosCadastro({ ...dadosCadastro, confirmarSenha: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {mostrarConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25 border-0 transition-all duration-300"
                    disabled={carregando}
                  >
                    {carregando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {carregando ? 'Cadastrando...' : 'Cadastrar'}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <p className="text-center text-xs text-white/30 mt-4">
            PosteGuard © 2026 — Sistema de Monitoramento
          </p>
        </div>
      </div>
    </div>
  );
}
