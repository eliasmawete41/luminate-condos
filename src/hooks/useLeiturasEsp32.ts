import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeituraEsp32 {
  id: string;
  ldr: number;
  poste_bom_status: string;
  corrente_poste_bom: number;
  potencia_poste_bom: number;
  poste_estragado_status: string;
  corrente_poste_estragado: number;
  potencia_poste_estragado: number;
  created_at: string;
}

export function useLeiturasEsp32(limite = 50) {
  const [leituras, setLeituras] = useState<LeituraEsp32[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let activo = true;

    async function carregar() {
      const { data, error } = await supabase
        .from('esp32_leituras')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);
      if (!activo) return;
      if (!error && data) setLeituras(data as LeituraEsp32[]);
      setCarregando(false);
    }
    carregar();

    const canal = supabase
      .channel('esp32_leituras_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'esp32_leituras' },
        (payload) => {
          setLeituras((anteriores) => {
            const nova = payload.new as LeituraEsp32;
            return [nova, ...anteriores].slice(0, limite);
          });
        },
      )
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(canal);
    };
  }, [limite]);

  return { leituras, carregando, ultima: leituras[0] ?? null };
}