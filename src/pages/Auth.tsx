import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Mail, Lock, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import condoBg from '@/assets/condominio-bg.jpg';

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
    <div className="flex min-h-screen">
      {/* Lado esquerdo - Imagem */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={condoBg}
          alt="Condomínio residencial"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="relative z-10 flex flex-col justify-end p-10 pb-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">PosteGuard</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-2">
            Monitoramento inteligente<br />para seu condomínio
          </h2>
          <p className="text-white/70 text-sm max-w-md">
            Gerencie postes, acompanhe manutenções e garanta a iluminação do seu condomínio em tempo real.
          </p>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 lg:hidden mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">PosteGuard</span>
          </div>

          {/* Abas */}
          <div>
            <div className="flex rounded-lg bg-muted p-1 mb-6">
              <button
                type="button"
                onClick={() => alternarModo('login')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  modoAtivo === 'login'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => alternarModo('cadastro')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  modoAtivo === 'cadastro'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Cadastrar
              </button>
            </div>

            {/* Alertas */}
            {erro && (
              <Alert variant="destructive" className="mb-4 py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{erro}</AlertDescription>
              </Alert>
            )}

            {sucesso && (
              <Alert className="mb-4 border-emerald-300 bg-emerald-50 py-2.5">
                <AlertDescription className="text-sm text-emerald-700">{sucesso}</AlertDescription>
              </Alert>
            )}

            {/* Login */}
            {modoAtivo === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10 h-10"
                      value={dadosLogin.email}
                      onChange={(e) => setDadosLogin({ ...dadosLogin, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 h-10"
                      value={dadosLogin.senha}
                      onChange={(e) => setDadosLogin({ ...dadosLogin, senha: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-10 font-medium" disabled={carregando}>
                  {carregando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {carregando ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            )}

            {/* Cadastro */}
            {modoAtivo === 'cadastro' && (
              <form onSubmit={handleCadastro} className="space-y-3.5">
                <p className="text-xs text-muted-foreground -mt-2 mb-1">Cadastro para moradores do condomínio</p>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Seu nome"
                      className="pl-10 h-10"
                      value={dadosCadastro.nomeCompleto}
                      onChange={(e) => setDadosCadastro({ ...dadosCadastro, nomeCompleto: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10 h-10"
                      value={dadosCadastro.email}
                      onChange={(e) => setDadosCadastro({ ...dadosCadastro, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 h-10"
                      value={dadosCadastro.senha}
                      onChange={(e) => setDadosCadastro({ ...dadosCadastro, senha: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmar senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 h-10"
                      value={dadosCadastro.confirmarSenha}
                      onChange={(e) => setDadosCadastro({ ...dadosCadastro, confirmarSenha: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-10 font-medium" disabled={carregando}>
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

          <p className="text-center text-xs text-muted-foreground">
            PosteGuard — Sistema de Monitoramento
          </p>
        </div>
      </div>
    </div>
  );
}
