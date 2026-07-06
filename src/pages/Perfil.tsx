import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/cartao';
import { Button } from '@/components/ui/botao';
import { Input } from '@/components/ui/entrada';
import { Label } from '@/components/ui/rotulo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/etiqueta';
import { User, Mail, Phone, Shield, Lock, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/ContextoAutenticacao';
import { toast } from 'sonner';

export default function Perfil() {
  const { user, profile, roles, isAdmin } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [dados, setDados] = useState({ full_name: '', phone: '', avatar_url: '' });
  const [senhas, setSenhas] = useState({ nova: '', confirmar: '' });

  useEffect(() => {
    if (profile) {
      setDados({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const salvarDados = async () => {
    if (!user) return;
    setSalvando(true);
    const { error } = await supabase.from('profiles').update({
      full_name: dados.full_name,
      phone: dados.phone || null,
      avatar_url: dados.avatar_url || null,
    }).eq('id', user.id);
    setSalvando(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Perfil atualizado');
  };

  const alterarSenha = async () => {
    if (senhas.nova.length < 6) { toast.error('Senha mínima de 6 caracteres'); return; }
    if (senhas.nova !== senhas.confirmar) { toast.error('As senhas não coincidem'); return; }
    setAlterandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: senhas.nova });
    setAlterandoSenha(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Senha alterada com sucesso');
    setSenhas({ nova: '', confirmar: '' });
  };

  const rotuloPapel = isAdmin ? 'Administrador' : roles.includes('manutencao') ? 'Técnico' : 'Morador';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-2xl gradient-sunset p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-white/30">
            <AvatarImage src={dados.avatar_url || undefined} />
            <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold drop-shadow-sm">{profile?.full_name || 'Meu Perfil'}</h1>
            <p className="text-white/80 text-sm truncate">{profile?.email}</p>
            <Badge className="mt-2 bg-white/20 text-white border-0">
              <Shield className="h-3 w-3 mr-1" />{rotuloPapel}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Dados Pessoais</CardTitle>
          <CardDescription>Atualize as suas informações de contato</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={dados.full_name} onChange={(e) => setDados({ ...dados, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={profile?.email || ''} disabled className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={dados.phone} onChange={(e) => setDados({ ...dados, phone: e.target.value })} className="pl-9" placeholder="+244 900 000 000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL do avatar</Label>
              <Input value={dados.avatar_url} onChange={(e) => setDados({ ...dados, avatar_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={salvarDados} disabled={salvando} className="gap-2">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Segurança</CardTitle>
          <CardDescription>Altere a sua senha de acesso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={senhas.nova} onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={senhas.confirmar} onChange={(e) => setSenhas({ ...senhas, confirmar: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={alterarSenha} disabled={alterandoSenha || !senhas.nova} variant="secondary" className="gap-2">
              {alterandoSenha ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Alterar senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}