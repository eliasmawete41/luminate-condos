
-- Tabela de dispositivos ESP32
CREATE TABLE public.esp32_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  name text NOT NULL,
  pole_id uuid REFERENCES public.poles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'inativo')),
  registered_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.esp32_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage devices"
  ON public.esp32_devices FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Sindicos can view devices"
  ON public.esp32_devices FOR SELECT
  USING (is_admin_or_sindico(auth.uid()));

-- Tabela de leituras dos sensores
CREATE TABLE public.device_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.esp32_devices(id) ON DELETE CASCADE,
  pole_id uuid REFERENCES public.poles(id) ON DELETE SET NULL,
  is_on boolean NOT NULL DEFAULT true,
  fault_detected boolean NOT NULL DEFAULT false,
  fault_type text,
  power_consumption_watts numeric,
  latitude numeric,
  longitude numeric,
  raw_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.device_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sindicos can view readings"
  ON public.device_readings FOR SELECT
  USING (is_admin_or_sindico(auth.uid()));

-- Trigger updated_at para esp32_devices
CREATE TRIGGER update_esp32_devices_updated_at
  BEFORE UPDATE ON public.esp32_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
