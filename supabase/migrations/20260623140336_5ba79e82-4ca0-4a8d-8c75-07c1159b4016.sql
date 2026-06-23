CREATE TABLE public.esp32_leituras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ldr integer NOT NULL DEFAULT 0,
  poste_bom_status text NOT NULL DEFAULT 'DESLIGADO',
  corrente_poste_bom numeric NOT NULL DEFAULT 0,
  potencia_poste_bom numeric NOT NULL DEFAULT 0,
  poste_estragado_status text NOT NULL DEFAULT 'DESLIGADO',
  corrente_poste_estragado numeric NOT NULL DEFAULT 0,
  potencia_poste_estragado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.esp32_leituras TO authenticated;
GRANT ALL ON public.esp32_leituras TO service_role;

ALTER TABLE public.esp32_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver leituras"
  ON public.esp32_leituras
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_esp32_leituras_created_at ON public.esp32_leituras (created_at DESC);

ALTER TABLE public.esp32_leituras REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.esp32_leituras;