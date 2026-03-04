import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, Lamp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const statusColors: Record<string, string> = {
  funcionando: '#22c55e',
  com_falha: '#f59e0b',
  em_manutencao: '#3b82f6',
  desativado: '#6b7280',
};

interface Pole {
  id: string;
  code: string;
  location_description: string;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  lighting_type: string;
  power_watts: number;
}

function createColoredIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function MapPage() {
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPoles();
  }, []);

  const fetchPoles = async () => {
    const { data } = await supabase
      .from('poles')
      .select('id, code, location_description, latitude, longitude, status, lighting_type, power_watts');
    setPoles((data || []).filter((p: any) => p.latitude && p.longitude));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const center: [number, number] = poles.length > 0
    ? [poles[0].latitude!, poles[0].longitude!]
    : [-8.838333, 13.234444]; // Luanda default

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
              center={center}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {poles.map((pole) => (
                <Marker
                  key={pole.id}
                  position={[pole.latitude!, pole.longitude!]}
                  icon={createColoredIcon(statusColors[pole.status || 'funcionando'])}
                >
                  <Popup>
                    <div className="text-sm space-y-1">
                      <p className="font-bold">{pole.code}</p>
                      <p>{pole.location_description}</p>
                      <p>Tipo: {pole.lighting_type}</p>
                      <p>Potência: {pole.power_watts}W</p>
                      <p>Status: {pole.status || 'funcionando'}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
