import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Wrench, CheckCircle2, AlertTriangle, Clock, Loader2,
  MapPin, Zap, Timer, Bell, ThumbsUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Maintenance = Database['public']['Tables']['maintenances']['Row'] & {
  poles: { code: string; location_description: string } | null;
};

const priorityConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  baixa: { label: 'Baixa', color: 'bg-slate-500/10 text-slate-600 border-slate-200', dotColor: 'bg-slate-400' },
  media: { label: 'Média', color: 'bg-amber-500/10 text-amber-600 border-amber-200', dotColor: 'bg-amber-400' },
  alta: { label: 'Alta', color: 'bg-orange-500/10 text-orange-600 border-orange-200', dotColor: 'bg-orange-500' },
  urgente: { label: 'Urgente', color: 'bg-red-500/10 text-red-600 border-red-200', dotColor: 'bg-red-500' },
};

const failureTypes: Record<string, string> = {
  lampada_queimada: 'Lâmpada Queimada',
  curto_circuito: 'Curto-Circuito',
  oscilacao: 'Oscilação',
  fiacao_danificada: 'Fiação Danificada',
  poste_danificado: 'Poste Danificado',
  outros: 'Outros',
};

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMaintenances();
    // Realtime for maintenances
    const channel = supabase
      .channel('tech-maintenances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenances' }, () => {
        fetchMaintenances();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMaintenances = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenances')
        .select('*, poles(code, location_description)')
        .in('status', ['aberto', 'em_andamento'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaintenances((data as unknown as Maintenance[]) || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMaintenance = async (maintenance: Maintenance) => {
    try {
      const { error } = await supabase
        .from('maintenances')
        .update({ status: 'em_andamento', assigned_to: user?.id })
        .eq('id', maintenance.id);
      if (error) throw error;
      toast({ title: 'Manutenção iniciada!' });
      fetchMaintenances();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleResolve = async () => {
    if (!selectedMaintenance) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('maintenances')
        .update({
          status: 'concluido',
          resolution_notes: resolutionNotes,
          completed_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', selectedMaintenance.id);

      if (error) throw error;

      // Update pole status back to funcionando
      if (selectedMaintenance.pole_id) {
        await supabase
          .from('poles')
          .update({ status: 'funcionando' })
          .eq('id', selectedMaintenance.pole_id);
      }

      toast({ title: '✅ Manutenção concluída com sucesso!' });
      setResolveDialog(false);
      setSelectedMaintenance(null);
      setResolutionNotes('');
      fetchMaintenances();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openResolve = (m: Maintenance) => {
    setSelectedMaintenance(m);
    setResolutionNotes('');
    setResolveDialog(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const pendingCount = maintenances.filter(m => m.status === 'aberto').length;
  const inProgressCount = maintenances.filter(m => m.status === 'em_andamento').length;
  const urgentCount = maintenances.filter(m => m.priority === 'urgente' || m.priority === 'alta').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl gradient-sunset p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-white/20">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl drop-shadow-sm">Painel do Técnico</h1>
            <p className="text-white/80">Gerencie suas ordens de manutenção</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pendentes</p>
                <p className="text-3xl font-bold">{pendingCount}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10">
                <Bell className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Em Andamento</p>
                <p className="text-3xl font-bold">{inProgressCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Timer className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Urgentes / Alta</p>
                <p className="text-3xl font-bold text-red-600">{urgentCount}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Ordens de Serviço
        </h2>
        {maintenances.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ThumbsUp className="h-16 w-16 mx-auto mb-4 text-emerald-400" />
              <h3 className="text-xl font-semibold text-emerald-600">Tudo em ordem!</h3>
              <p className="text-muted-foreground mt-1">Não há manutenções pendentes no momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {maintenances.map((m) => {
              const priority = priorityConfig[m.priority || 'media'];
              const isInProgress = m.status === 'em_andamento';
              return (
                <Card key={m.id} className={cn(
                  "hover:shadow-lg transition-all border-l-4",
                  m.priority === 'urgente' ? "border-l-red-500" :
                  m.priority === 'alta' ? "border-l-orange-500" :
                  m.priority === 'media' ? "border-l-amber-500" : "border-l-slate-300"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2.5 w-2.5 rounded-full animate-pulse", priority.dotColor)} />
                        <CardTitle className="text-base">{m.poles?.code || 'N/A'}</CardTitle>
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className={cn(priority.color, "text-xs")}>{priority.label}</Badge>
                        <Badge variant={isInProgress ? 'default' : 'outline'} className="text-xs">
                          {isInProgress ? 'Em Andamento' : 'Aberto'}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {m.poles?.location_description || 'Localização não informada'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1.5">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{failureTypes[m.failure_type] || m.failure_type}</span>
                      </div>
                      <p className="text-sm">{m.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Aberto em {formatDate(m.created_at || '')}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {!isInProgress ? (
                        <Button size="sm" onClick={() => handleStartMaintenance(m)} className="flex-1 gap-1.5">
                          <Timer className="h-4 w-4" />
                          Iniciar
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => openResolve(m)} className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Concluir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Confirmar Conclusão
            </DialogTitle>
            <DialogDescription>
              Poste {selectedMaintenance?.poles?.code} — {failureTypes[selectedMaintenance?.failure_type || ''] || ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Observações da resolução</Label>
              <Textarea
                placeholder="Descreva o que foi feito para resolver o problema..."
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(false)}>Cancelar</Button>
            <Button onClick={handleResolve} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar Conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
