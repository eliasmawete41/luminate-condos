
-- Add verification status and requested unit for residents
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aprovado',
  ADD COLUMN IF NOT EXISTS requested_unit_id uuid REFERENCES public.units(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Password reset requests (fictitious emails workflow)
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  unit_number text,
  status text NOT NULL DEFAULT 'pendente',
  token text UNIQUE,
  token_expires_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_reset_requests TO authenticated;
GRANT SELECT, INSERT ON public.password_reset_requests TO anon;
GRANT ALL ON public.password_reset_requests TO service_role;

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can request password reset"
  ON public.password_reset_requests FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can read own request by token"
  ON public.password_reset_requests FOR SELECT TO anon USING (true);

CREATE POLICY "admins manage requests"
  ON public.password_reset_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users see own requests"
  ON public.password_reset_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_prr_updated_at BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user to mark residents as pending and store requested_unit_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_unit uuid;
  v_status text;
BEGIN
  v_unit := NULLIF(NEW.raw_user_meta_data->>'requested_unit_id','')::uuid;
  v_status := CASE WHEN v_unit IS NOT NULL THEN 'pendente' ELSE 'aprovado' END;

  INSERT INTO public.profiles (id, full_name, email, phone, status, requested_unit_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    v_status,
    v_unit
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'morador');

  -- Notify admins of new pending resident
  IF v_status = 'pendente' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT ur.user_id, 'Novo cadastro de morador',
           COALESCE(NEW.raw_user_meta_data->>'full_name','Usuário') || ' aguarda aprovação.',
           'cadastro_pendente'
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

-- Function admins call to approve a pending resident
CREATE OR REPLACE FUNCTION public.approve_resident(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_unit uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar';
  END IF;

  SELECT requested_unit_id INTO v_unit FROM public.profiles WHERE id = _user_id;

  UPDATE public.profiles SET status='aprovado', rejection_reason=NULL WHERE id=_user_id;

  IF v_unit IS NOT NULL THEN
    INSERT INTO public.residents (user_id, unit_id, resident_type, is_primary)
    VALUES (_user_id, v_unit, 'proprietario', true)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_user_id, 'Cadastro aprovado', 'Seu acesso foi liberado. Bem-vindo!', 'cadastro_aprovado');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_resident(_user_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem rejeitar';
  END IF;
  UPDATE public.profiles SET status='rejeitado', rejection_reason=_reason WHERE id=_user_id;
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_user_id, 'Cadastro rejeitado', COALESCE(_reason,'Cadastro não aprovado.'), 'cadastro_rejeitado');
END;
$$;
