GRANT SELECT ON TABLE public.esp32_leituras TO authenticated;
GRANT ALL ON TABLE public.esp32_leituras TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'esp32_leituras'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.esp32_leituras;
  END IF;
END $$;

ALTER TABLE public.esp32_leituras REPLICA IDENTITY FULL;