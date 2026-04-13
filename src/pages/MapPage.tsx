import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, Lamp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

  // Buscar postes com coordenadas
  const buscarPostes = async () => {
    const { data } = await supabase
      .from('poles')
      .select('id, code, location_description, latitude, longitude, status, lighting_type, power_watts');
    setPostes((data || []).filter((p: any) => p.latitude && p.longitude));
    setCarregando(false);
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Centro do mapa (primeiro poste ou Luanda como padrão)
  const centro: [number, number] = postes.length > 0
    ? [postes[0].latitude!, postes[0].longitude!]
    : [-8.838333, 13.234444];

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
              center={centro}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
