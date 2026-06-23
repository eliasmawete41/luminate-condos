import { useEffect, useMemo, useState } from 'react';
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

type EstadoTempoReal = 'a_ligar' | 'ligado' | 'erro';

function normalizarLeitura(valor: unknown): LeituraEsp32 {
  const leitura = valor as Record<string, unknown>;

  return {
    id: String(leitura.id ?? crypto.randomUUID()),
    ldr: Number(leitura.ldr ?? 0),
    poste_bom_status: String(leitura.poste_bom_status ?? 'DESLIGADO'),
    corrente_poste_bom: Number(leitura.corrente_poste_bom ?? 0),
    potencia_poste_bom: Number(leitura.potencia_poste_bom ?? 0),
    poste_estragado_status: String(leitura.poste_estragado_status ?? 'DESLIGADO'),
    corrente_poste_estragado: Number(leitura.corrente_poste_estragado ?? 0),
    potencia_poste_estragado: Number(leitura.potencia_poste_estragado ?? 0),
    created_at: String(leitura.created_at ?? new Date().toISOString()),
  };
}

function ordenarPorDataDesc(a: LeituraEsp32, b: LeituraEsp32) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function useLeiturasEsp32(limite = 50) {
  const [leituras, setLeituras] = useState<LeituraEsp32[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [estadoTempoReal, setEstadoTempoReal] = useState<EstadoTempoReal>('a_ligar');
  const nomeCanal = useMemo(
    () => `esp32_leituras_tempo_real_${Math.random().toString(36).slice(2)}`,
    [],
  );

  useEffect(() => {
    let activo = true;

    async function carregar() {
      const { data, error } = await supabase
        .from('esp32_leituras')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);

      if (!activo) return;
      if (!error && data) {
        setLeituras(data.map(normalizarLeitura));
      }
      setCarregando(false);
    }

    carregar();

    const canal = supabase
      .channel(nomeCanal)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'esp32_leituras' },
        (payload) => {
          const nova = normalizarLeitura(payload.new);

          setLeituras((anteriores) => {
            const semDuplicados = anteriores.filter((leitura) => leitura.id !== nova.id);
            return [nova, ...semDuplicados].sort(ordenarPorDataDesc).slice(0, limite);
          });
        },
      )
      .subscribe((estado) => {
        if (!activo) return;

        if (estado === 'SUBSCRIBED') {
          setEstadoTempoReal('ligado');
          carregar();
          return;
        }

        if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
          setEstadoTempoReal('erro');
        }
      });

    const actualizacaoReserva = window.setInterval(() => {
      carregar();
    }, 5000);

    return () => {
      activo = false;
      window.clearInterval(actualizacaoReserva);
      supabase.removeChannel(canal);
    };
  }, [limite, nomeCanal]);

  return { leituras, carregando, ultima: leituras[0] ?? null, estadoTempoReal };
}