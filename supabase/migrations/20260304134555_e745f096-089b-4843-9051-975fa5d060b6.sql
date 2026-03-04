-- Tabela de conversas de suporte
CREATE TABLE public.support_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_id uuid NOT NULL,
    subject text NOT NULL DEFAULT 'Novo atendimento',
    status text NOT NULL DEFAULT 'aberto',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de mensagens de suporte (chat consumidor/admin)
CREATE TABLE public.support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    is_from_bot boolean DEFAULT false,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabela de avaliações do sistema/atendimento
CREATE TABLE public.evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type text NOT NULL DEFAULT 'sistema',
    rating integer NOT NULL,
    comment text,
    conversation_id uuid REFERENCES public.support_conversations(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Tabela de configurações do condomínio (telefone, etc)
CREATE TABLE public.condo_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    support_phone text,
    support_email text,
    condo_name text DEFAULT 'Condomínio',
    updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condo_settings ENABLE ROW LEVEL SECURITY;

-- Policies for support_conversations
CREATE POLICY "Consumers can view own conversations" ON public.support_conversations
    FOR SELECT TO authenticated USING (consumer_id = auth.uid() OR public.is_admin_or_sindico(auth.uid()));

CREATE POLICY "Consumers can create conversations" ON public.support_conversations
    FOR INSERT TO authenticated WITH CHECK (consumer_id = auth.uid());

CREATE POLICY "Admins can update conversations" ON public.support_conversations
    FOR UPDATE TO authenticated USING (public.is_admin_or_sindico(auth.uid()));

-- Policies for support_messages
CREATE POLICY "Users can view messages in their conversations" ON public.support_messages
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.support_conversations sc 
            WHERE sc.id = conversation_id 
            AND (sc.consumer_id = auth.uid() OR public.is_admin_or_sindico(auth.uid()))
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON public.support_messages
    FOR INSERT TO authenticated WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.support_conversations sc 
            WHERE sc.id = conversation_id 
            AND (sc.consumer_id = auth.uid() OR public.is_admin_or_sindico(auth.uid()))
        )
    );

CREATE POLICY "Admins can update messages" ON public.support_messages
    FOR UPDATE TO authenticated USING (public.is_admin_or_sindico(auth.uid()));

-- Policies for evaluations
CREATE POLICY "Users can create evaluations" ON public.evaluations
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own evaluations" ON public.evaluations
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_sindico(auth.uid()));

-- Policies for condo_settings
CREATE POLICY "Everyone can view settings" ON public.condo_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings" ON public.condo_settings
    FOR ALL TO authenticated USING (public.is_admin_or_sindico(auth.uid()));

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Insert default condo settings
INSERT INTO public.condo_settings (support_phone, condo_name) VALUES ('+244 923 456 789', 'Condomínio PosteGuard');