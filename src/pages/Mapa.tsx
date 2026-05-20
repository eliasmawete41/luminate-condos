import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/cartao';
import { Loader2, MapPin, Lamp } from 'lucide-react';
import { Badge } from '@/components/ui/etiqueta';
import { supabase } from '@/integrations/supabase/client';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarPostes();
  }, []);

  // Buscar todos os postes; distribui em volta do condomínio se não tiverem coordenadas
  const buscarPostes = async () => {
    const { data } = await supabase
      .from('poles')
      .select('id, code, location_description, latitude, longitude, status, lighting_type, power_watts');
    const lista = data || [];
    const semCoord = lista.filter((p: any) => !p.latitude || !p.longitude);
    const total = Math.max(semCoord.length, 1);
    const comCoordenadas = lista.map((p: any) => {
      if (p.latitude && p.longitude) return p;
      // Distribui os postes sem coordenadas em círculo ao redor do centro
      const idx = semCoord.findIndex((x: any) => x.id === p.id);
      const angulo = (idx / total) * 2 * Math.PI;
      const raio = 0.0015; // ~150m
      return {
        ...p,
        latitude: CENTRO_CONDOMINIO[0] + raio * Math.cos(angulo),
        longitude: CENTRO_CONDOMINIO[1] + raio * Math.sin(angulo),
      };
    });
    setPostes(comCoordenadas);
    setCarregando(false);
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
                    <div className="text-sm space-y-1">
                      <p className="font-bold">{poste.code}</p>
                      <p>{poste.location_description}</p>
                      <p>Tipo: {poste.lighting_type}</p>
                      <p>Potência: {poste.power_watts}W</p>
                      <p>Status: {poste.status || 'funcionando'}</p>
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
    </div>
  );
}
