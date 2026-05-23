import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { Button } from '@/components/ui/botao';
import { Alert, AlertDescription } from '@/components/ui/alerta';
import { Zap, Mail, Lock, AlertCircle, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles, KeyRound, X } from 'lucide-react';
import { z } from 'zod';
import condoBg from '@/assets/condominio-bg.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const esquemaLogin = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export default function Auth() {
  const { user, loading, signIn, isAdmin } = useAuth();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [dadosLogin, setDadosLogin] = useState({ email: '', senha: '' });
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [recuperando, setRecuperando] = useState(false);

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
                { titulo: 'Postes monitorados', valor: '24/7' },
                { titulo: 'Tempo médio de resposta', valor: '< 2min' },
                { titulo: 'Sensores IoT', valor: 'ESP32' },
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
              <div className="px-8 pt-10 pb-6 text-center lg:text-left">
                <div className="lg:hidden flex items-center justify-center gap-3 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Bem-vindo de volta</h2>
                <p className="mt-2 text-sm text-white/60">
                  Acesse a sua conta para continuar.
                </p>
              </div>

              <div className="px-8 pb-8">
                {erro && (
                  <Alert variant="destructive" className="mb-5 py-2.5 bg-red-500/10 border-red-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm text-red-200">{erro}</AlertDescription>
                  </Alert>
                )}

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

                <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3.5">
                  <ShieldCheck className="h-4 w-4 text-amber-300 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/70 leading-relaxed">
                    O cadastro de moradores é feito pela administração do condomínio.
                    Solicite o seu acesso ao síndico ou administrador.
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
    </div>
  );
}
