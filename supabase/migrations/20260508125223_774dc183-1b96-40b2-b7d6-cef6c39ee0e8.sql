
-- Migrar usuários
UPDATE public.user_roles SET role = 'admin' WHERE role::text IN ('sindico', 'subsindico');
DELETE FROM public.user_roles a USING public.user_roles b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.role = b.role;

-- Drop policies que dependem de has_role(uuid, app_role)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and maintenance can manage poles" ON public.poles;
DROP POLICY IF EXISTS "Admins and maintenance can update maintenances" ON public.maintenances;
DROP POLICY IF EXISTS "Admins and maintenance can manage replacements" ON public.component_replacements;
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.preventive_schedules;
DROP POLICY IF EXISTS "Admins can manage devices" ON public.esp32_devices;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- Recriar enum sem sindico/subsindico
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('admin', 'morador', 'manutencao');

ALTER TABLE public.user_roles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role,
  ALTER COLUMN role SET DEFAULT 'morador'::public.app_role;

DROP TYPE public.app_role_old;

-- Recriar função has_role com novo enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Atualizar is_admin_or_sindico para considerar apenas admin
CREATE OR REPLACE FUNCTION public.is_admin_or_sindico(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Recriar policies
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and maintenance can manage poles" ON public.poles
  FOR ALL TO authenticated
  USING (public.is_admin_or_sindico(auth.uid()) OR public.has_role(auth.uid(), 'manutencao'));

CREATE POLICY "Admins and maintenance can update maintenances" ON public.maintenances
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_sindico(auth.uid()) OR public.has_role(auth.uid(), 'manutencao'));

CREATE POLICY "Admins and maintenance can manage replacements" ON public.component_replacements
  FOR ALL TO authenticated
  USING (public.is_admin_or_sindico(auth.uid()) OR public.has_role(auth.uid(), 'manutencao'));

CREATE POLICY "Admins can manage schedules" ON public.preventive_schedules
  FOR ALL TO authenticated
  USING (public.is_admin_or_sindico(auth.uid()) OR public.has_role(auth.uid(), 'manutencao'));

CREATE POLICY "Admins can manage devices" ON public.esp32_devices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
