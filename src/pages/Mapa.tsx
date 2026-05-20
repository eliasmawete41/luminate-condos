import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/cartao';
import { Loader2, MapPin, Lamp, History } from 'lucide-react';
import { Badge } from '@/components/ui/etiqueta';
import { Button } from '@/components/ui/botao';
import { supabase } from '@/integrations/supabase/client';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialogo';

// Corrigir ícones padrão dos marcadores
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Cores por status
const coresStatus: Record<string, string> = {
  funcionando: '#22c55e',
  com_falha: '#f59e0b',
  em_manutencao: '#3b82f6',
  desativado: '#6b7280',
};

// Centro do Condomínio Jardim de Rosa (Talatona, Luanda)
const CENTRO_CONDOMINIO: [number, number] = [-8.9183, 13.1830];
const RAIO_CONDOMINIO_METROS = 400;

// Interface do poste no mapa
interface PosteMapa {
  id: string;
  code: string;
  location_description: string;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  lighting_type: string;
  power_watts: number;
  last_maintenance_date: string | null;
}

interface ManutencaoMapa {
  id: string;
  pole_id: string;
  failure_type: string;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  description: string;
  created_at: string;
}

// Criar ícone colorido para marcador
function criarIconeColorido(cor: string) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${cor};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function PaginaMapa() {
  const [postes, setPostes] = useState<PosteMapa[]>([]);
  const [manutencoes, setManutencoes] = useState<ManutencaoMapa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [posteSelecionado, setPosteSelecionado] = useState<PosteMapa | null>(null);

  useEffect(() => {
    buscarPostes();
  }, []);

  // Buscar todos os postes e manutenções
  const buscarPostes = async () => {
    const [resPostes, resManutencoes] = await Promise.all([
      supabase
        .from('poles')
        .select('id, code, location_description, latitude, longitude, status, lighting_type, power_watts'),
      supabase
        .from('maintenances')
        .select('id, pole_id, failure_type, status, scheduled_date, completed_date, description, created_at')
        .order('created_at', { ascending: false }),
    ]);

    const listaPostes = resPostes.data || [];
    const listaManutencoes = (resManutencoes.data || []) as ManutencaoMapa[];
    setManutencoes(listaManutencoes);

    // Mapear última manutenção por poste
    const ultimaPorPoste: Record<string, string> = {};
    listaManutencoes.forEach((m) => {
      if (!ultimaPorPoste[m.pole_id]) {
        ultimaPorPoste[m.pole_id] = m.completed_date || m.scheduled_date || m.created_at;
      }
    });

    const semCoord = listaPostes.filter((p: any) => !p.latitude || !p.longitude);
    const total = Math.max(semCoord.length, 1);
    const comCoordenadas: PosteMapa[] = listaPostes.map((p: any) => {
      if (p.latitude && p.longitude) {
        return { ...p, last_maintenance_date: ultimaPorPoste[p.id] || null };
      }
      const idx = semCoord.findIndex((x: any) => x.id === p.id);
      const angulo = (idx / total) * 2 * Math.PI;
      const raio = 0.0015;
      return {
        ...p,
        latitude: CENTRO_CONDOMINIO[0] + raio * Math.cos(angulo),
        longitude: CENTRO_CONDOMINIO[1] + raio * Math.sin(angulo),
        last_maintenance_date: ultimaPorPoste[p.id] || null,
      };
    });
    setPostes(comCoordenadas);
    setCarregando(false);
  };

  const abrirHistorico = (poste: PosteMapa) => {
    setPosteSelecionado(poste);
    setDialogoAberto(true);
  };

  const historicoPoste = posteSelecionado
    ? manutencoes.filter((m) => m.pole_id === posteSelecionado.id)
    : [];

  const formatarData = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Limites do mapa restritos ao condomínio
  const limites: L.LatLngBoundsExpression = [
    [CENTRO_CONDOMINIO[0] - 0.006, CENTRO_CONDOMINIO[1] - 0.006],
    [CENTRO_CONDOMINIO[0] + 0.006, CENTRO_CONDOMINIO[1] + 0.006],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl gradient-sunset p-5 text-white shadow-lg">
        <h1 className="text-xl font-bold md:text-2xl flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Mapa de Postes
        </h1>
        <p className="text-white/80 text-sm">Localização geográfica dos postes de iluminação</p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[calc(100vh-280px)] min-h-[400px]">
            <MapContainer
              center={CENTRO_CONDOMINIO}
              zoom={17}
              minZoom={16}
              maxZoom={19}
              maxBounds={limites}
              maxBoundsViscosity={1.0}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Circle
                center={CENTRO_CONDOMINIO}
                radius={RAIO_CONDOMINIO_METROS}
                pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.08, weight: 2 }}
              />
              {postes.map((poste) => (
                <Marker
                  key={poste.id}
                  position={[poste.latitude!, poste.longitude!]}
                  icon={criarIconeColorido(coresStatus[poste.status || 'funcionando'])}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[180px]">
                      <p className="font-bold text-base">{poste.code}</p>
                      <p className="text-muted-foreground">{poste.location_description}</p>
                      <p><span className="font-medium">Tipo:</span> {poste.lighting_type}</p>
                      <p><span className="font-medium">Potência:</span> {poste.power_watts}W</p>
                      <p><span className="font-medium">Status:</span> {poste.status?.replace('_', ' ') || 'funcionando'}</p>
                      <p><span className="font-medium">Última manutenção:</span> {formatarData(poste.last_maintenance_date)}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full gap-1"
                        onClick={() => abrirHistorico(poste)}
                      >
                        <History className="h-3.5 w-3.5" />
                        Ver histórico
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(coresStatus).map(([status, cor]) => (
          <div key={status} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cor }} />
            <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Dialog de histórico */}
      <Dialog open={dialogoAberto} onOpenChange={setDialogoAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de Manutenções</DialogTitle>
            <DialogDescription>
              {posteSelecionado ? `Poste ${posteSelecionado.code}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {historicoPoste.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma manutenção registrada.</p>
            ) : (
              historicoPoste.map((m) => (
                <div key={m.id} className="border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{m.failure_type.replace('_', ' ')}</span>
                    <Badge variant="outline" className="text-xs">
                      {m.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{m.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Registrado: {formatarData(m.created_at)}</span>
                    {m.completed_date && <span>Concluído: {formatarData(m.completed_date)}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
