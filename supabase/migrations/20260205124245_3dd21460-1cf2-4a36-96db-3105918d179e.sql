
-- Enum para tipos de role
CREATE TYPE public.app_role AS ENUM ('admin', 'sindico', 'subsindico', 'morador', 'manutencao');

-- Enum para tipo de morador
CREATE TYPE public.resident_type AS ENUM ('proprietario', 'inquilino', 'morador');

-- Enum para situação da unidade
CREATE TYPE public.unit_status AS ENUM ('ocupada', 'vazia', 'alugada');

-- Enum para tipo de iluminação
CREATE TYPE public.lighting_type AS ENUM ('led', 'fluorescente', 'solar', 'halogenea', 'vapor_sodio', 'vapor_mercurio');

-- Enum para status do poste
CREATE TYPE public.pole_status AS ENUM ('funcionando', 'com_falha', 'em_manutencao', 'desativado');

-- Enum para tipo de falha
CREATE TYPE public.failure_type AS ENUM ('lampada_queimada', 'curto_circuito', 'oscilacao', 'fiacao_danificada', 'poste_danificado', 'outros');

-- Enum para status de manutenção
CREATE TYPE public.maintenance_status AS ENUM ('aberto', 'em_andamento', 'concluido', 'cancelado');

-- Enum para prioridade
CREATE TYPE public.priority_level AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de roles (separada conforme instruções de segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'morador',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Tabela de blocos
CREATE TABLE public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de unidades (apartamentos)
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
    number TEXT NOT NULL,
    floor INTEGER,
    status unit_status DEFAULT 'vazia',
    parking_spots INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_id, number)
);

-- Tabela de residentes (vinculação usuário-unidade)
CREATE TABLE public.residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
    resident_type resident_type NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    move_in_date DATE DEFAULT CURRENT_DATE,
    move_out_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histórico de moradores por unidade
CREATE TABLE public.resident_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resident_name TEXT NOT NULL,
    resident_type resident_type NOT NULL,
    move_in_date DATE NOT NULL,
    move_out_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de postes
CREATE TABLE public.poles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    location_description TEXT NOT NULL,
    location_type TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    lighting_type lighting_type NOT NULL,
    power_watts INTEGER NOT NULL,
    installation_date DATE,
    status pole_status DEFAULT 'funcionando',
    maintenance_company TEXT,
    lamp_lifespan_hours INTEGER DEFAULT 50000,
    current_lamp_hours INTEGER DEFAULT 0,
    last_lamp_change DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de manutenções
CREATE TABLE public.maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pole_id UUID REFERENCES public.poles(id) ON DELETE CASCADE NOT NULL,
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    failure_type failure_type NOT NULL,
    description TEXT NOT NULL,
    priority priority_level DEFAULT 'media',
    status maintenance_status DEFAULT 'aberto',
    scheduled_date DATE,
    completed_date DATE,
    resolution_notes TEXT,
    cost DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de componentes trocados
CREATE TABLE public.component_replacements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id UUID REFERENCES public.maintenances(id) ON DELETE CASCADE NOT NULL,
    component_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de notificações
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_pole_id UUID REFERENCES public.poles(id) ON DELETE SET NULL,
    related_maintenance_id UUID REFERENCES public.maintenances(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de manutenções preventivas agendadas
CREATE TABLE public.preventive_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pole_id UUID REFERENCES public.poles(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    frequency_days INTEGER NOT NULL,
    last_executed DATE,
    next_scheduled DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventive_schedules ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é admin ou síndico
CREATE OR REPLACE FUNCTION public.is_admin_or_sindico(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'sindico', 'subsindico')
  )
$$;

-- RLS Policies para profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies para user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- RLS Policies para blocks
CREATE POLICY "Everyone can view blocks" ON public.blocks FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins can manage blocks" ON public.blocks FOR ALL TO authenticated USING (public.is_admin_or_sindico(auth.uid()));

-- RLS Policies para units
CREATE POLICY "Everyone can view units" ON public.units FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins can manage units" ON public.units FOR ALL TO authenticated USING (public.is_admin_or_sindico(auth.uid()));

-- RLS Policies para residents
CREATE POLICY "Everyone can view residents" ON public.residents FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins can manage residents" ON public.residents FOR ALL TO authenticated USING (public.is_admin_or_sindico(auth.uid()));

-- RLS Policies para resident_history
CREATE POLICY "Everyone can view resident history" ON public.resident_history FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins can manage resident history" ON public.resident_history FOR ALL TO authenticated USING (public.is_admin_or_sindico(auth.uid()));

-- RLS Policies para poles
CREATE POLICY "Everyone can view poles" ON public.poles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins and maintenance can manage poles" ON public.poles FOR ALL TO authenticated USING (public.is_admin_or_sindico(auth.uid()) OR public.has_role(auth.uid(), 'manutencao'));

-- RLS Policies para maintenances
CREATE POLICY "Everyone can view maintenances" ON public.maintenances FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Everyone can create maintenances" ON public.maintenances FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Admins and maintenance can update maintenances" ON public.maintenances FOR UPDATE TO authenticated USING (public.is_admin_or_sindico(auth.uid()) OR public.has_role(auth.uid(), 'manutencao'));

-- RLS Policies para component_replacements
CREATE POLICY "Everyone can view component replacements" ON public.component_replacements FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins and maintenance can manage replacements" ON public.component_replacements FOR ALL TO authenticated USING (public.is_admin_or_sindico(auth.uid()) OR public.has_role(auth.uid(), 'manutencao'));

-- RLS Policies para notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_sindico(auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies para preventive_schedules
CREATE POLICY "Everyone can view schedules" ON public.preventive_schedules FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins can manage schedules" ON public.preventive_schedules FOR ALL TO authenticated USING (public.is_admin_or_sindico(auth.uid()) OR public.has_role(auth.uid(), 'manutencao'));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON public.blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_poles_updated_at BEFORE UPDATE ON public.poles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenances_updated_at BEFORE UPDATE ON public.maintenances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_preventive_schedules_updated_at BEFORE UPDATE ON public.preventive_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar profile automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'), NEW.email);
    
    -- Atribui role padrão de morador
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'morador');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
