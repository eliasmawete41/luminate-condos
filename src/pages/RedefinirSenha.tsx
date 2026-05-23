import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/botao';
import { Alert, AlertDescription } from '@/components/ui/alerta';
import { Lock, AlertCircle, Loader2, Eye, EyeOff, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sessaoValida, setSessaoValida] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    // Supabase coloca o token no hash; ao detectar recuperação, valida sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessaoValida(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessaoValida(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As senhas não coincidem');
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }
    setSucesso(true);
    toast.success('Senha redefinida com sucesso!');
    await supabase.auth.signOut();
    setTimeout(() => navigate('/auth', { replace: true }), 2000);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 flex items-center justify-center p-4">
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/40">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Redefinir senha</h1>
              <p className="text-xs text-white/60">Defina sua nova senha de acesso</p>
            </div>
          </div>

          {!sessaoValida && !sucesso && (
            <Alert variant="destructive" className="mb-5 bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm text-red-200">
                Link inválido ou expirado. Solicite novamente a recuperação de senha.
              </AlertDescription>
            </Alert>
          )}

          {sucesso ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-medium">Senha alterada com sucesso!</p>
              <p className="text-sm text-white/60 mt-1">Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {erro && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm text-red-200">{erro}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className="text-sm font-medium text-white/80 mb-2 block">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type={mostrar ? 'text' : 'password'}
                    placeholder="••••••••"
                    disabled={!sessaoValida}
                    className="w-full h-12 pl-11 pr-11 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all text-sm disabled:opacity-50"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <button type="button" onClick={() => setMostrar(!mostrar)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80">
                    {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white/80 mb-2 block">Confirmar nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type={mostrar ? 'text' : 'password'}
                    placeholder="••••••••"
                    disabled={!sessaoValida}
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-all text-sm disabled:opacity-50"
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={carregando || !sessaoValida}
                className="w-full h-12 font-semibold rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg shadow-orange-500/30 border-0"
              >
                {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {carregando ? 'Salvando...' : 'Redefinir senha'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}