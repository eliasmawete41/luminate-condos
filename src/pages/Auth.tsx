import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      loginSchema.parse(loginData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Por favor, confirme seu email antes de entrar');
      } else {
        setError(error.message);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      signupSchema.parse(signupData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setError('Este email já está cadastrado');
      } else {
        setError(error.message);
      }
    } else {
      setSuccess('Cadastro realizado com sucesso!');
      setSignupData({ fullName: '', email: '', password: '', confirmPassword: '' });
    }
  };

  const switchToRegister = () => {
    setIsActive(true);
    setError(null);
    setSuccess(null);
  };

  const switchToLogin = () => {
    setIsActive(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <div 
        className={`relative w-full max-w-[850px] min-h-[550px] bg-card rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${isActive ? 'active' : ''}`}
        style={{ perspective: '1000px' }}
      >
        {/* Login Form */}
        <div 
          className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center px-10 transition-all duration-500 z-10 
            ${isActive ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}
        >
          <form onSubmit={handleLogin} className="w-full max-w-xs space-y-5">
            <h2 className="text-3xl font-bold text-foreground text-center mb-2">Login</h2>
            
            {error && !isActive && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                className="pl-12 h-12 rounded-lg border-border bg-muted/50 focus:bg-background"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Senha"
                className="pl-12 h-12 rounded-lg border-border bg-muted/50 focus:bg-background"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>
            
            <a href="#" className="block text-sm text-muted-foreground hover:text-primary text-right transition-colors">
              Esqueceu a senha?
            </a>
            
            <Button 
              type="submit" 
              className="w-full h-12 rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>

        {/* Register Form */}
        <div 
          className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center px-10 transition-all duration-500 z-10
            ${isActive ? 'translate-x-full opacity-100' : 'translate-x-0 opacity-0 pointer-events-none'}`}
        >
          <form onSubmit={handleSignup} className="w-full max-w-xs space-y-4">
            <h2 className="text-3xl font-bold text-foreground text-center mb-2">Cadastro</h2>
            
            {error && isActive && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-success bg-success/10 py-2">
                <AlertDescription className="text-success text-sm">{success}</AlertDescription>
              </Alert>
            )}
            
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Nome completo"
                className="pl-12 h-11 rounded-lg border-border bg-muted/50 focus:bg-background"
                value={signupData.fullName}
                onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
              />
            </div>
            
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                className="pl-12 h-11 rounded-lg border-border bg-muted/50 focus:bg-background"
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Senha"
                className="pl-12 h-11 rounded-lg border-border bg-muted/50 focus:bg-background"
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Confirmar senha"
                className="pl-12 h-11 rounded-lg border-border bg-muted/50 focus:bg-background"
                value={signupData.confirmPassword}
                onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar'
              )}
            </Button>
          </form>
        </div>

        {/* Toggle Panel */}
        <div 
          className={`absolute top-0 w-1/2 h-full bg-gradient-to-br from-primary via-primary to-accent overflow-hidden transition-all duration-500 z-20 rounded-3xl
            ${isActive ? 'left-0 rounded-r-[150px]' : 'left-1/2 rounded-l-[150px]'}`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
            {/* Logo */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
                <Zap className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            
            {!isActive ? (
              <>
                <h3 className="text-3xl font-bold text-primary-foreground mb-3">
                  Olá, Bem-vindo!
                </h3>
                <p className="text-primary-foreground/80 mb-8 text-sm leading-relaxed">
                  Não possui uma conta?<br />Cadastre-se para acessar o sistema
                </p>
                <Button 
                  variant="outline" 
                  className="border-2 border-primary-foreground text-primary-foreground bg-transparent hover:bg-primary-foreground hover:text-primary px-10 h-11 rounded-lg font-semibold transition-all"
                  onClick={switchToRegister}
                  type="button"
                >
                  Cadastrar
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-3xl font-bold text-primary-foreground mb-3">
                  Bem-vindo de volta!
                </h3>
                <p className="text-primary-foreground/80 mb-8 text-sm leading-relaxed">
                  Já possui uma conta?<br />Entre para acessar o sistema
                </p>
                <Button 
                  variant="outline" 
                  className="border-2 border-primary-foreground text-primary-foreground bg-transparent hover:bg-primary-foreground hover:text-primary px-10 h-11 rounded-lg font-semibold transition-all"
                  onClick={switchToLogin}
                  type="button"
                >
                  Entrar
                </Button>
              </>
            )}
            
            <p className="absolute bottom-6 text-xs text-primary-foreground/60">
              PosteGuard - Sistema de Monitoramento
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <style>{`
        @media (max-width: 768px) {
          .relative.w-full.max-w-\\[850px\\] {
            max-width: 400px;
            min-height: auto;
          }
          .relative.w-full.max-w-\\[850px\\] > div:first-child,
          .relative.w-full.max-w-\\[850px\\] > div:nth-child(2) {
            position: relative;
            width: 100%;
            padding: 2rem 1.5rem;
            transform: none !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          .relative.w-full.max-w-\\[850px\\] > div:last-child {
            position: relative;
            width: 100%;
            left: 0 !important;
            border-radius: 1.5rem !important;
            padding: 2rem;
            min-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}
