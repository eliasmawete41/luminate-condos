
-- Notification triggers: keep admins/tecnico/morador informed
CREATE OR REPLACE FUNCTION public.notify_on_maintenance_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pole_code text; v_admin uuid;
BEGIN
  SELECT code INTO v_pole_code FROM public.poles WHERE id = NEW.pole_id;

  IF TG_OP = 'INSERT' THEN
    -- notify admins of new occurrence
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT ur.user_id, 'Nova ocorrência',
      'Nova ocorrência no poste ' || COALESCE(v_pole_code,'N/A') || ' (' || NEW.failure_type || ').',
      'nova_ocorrencia'
    FROM public.user_roles ur WHERE ur.role = 'admin';

    -- notify assigned technician
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.assigned_to, 'Nova ordem atribuída',
        'Você foi designado para atender o poste ' || COALESCE(v_pole_code,'N/A') || '.',
        'ordem_atribuida');
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- notify technician when newly assigned
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.assigned_to, 'Nova ordem atribuída',
        'Você foi designado para atender o poste ' || COALESCE(v_pole_code,'N/A') || '.',
        'ordem_atribuida');
    END IF;

    -- notify the reporter (morador) when status changed
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.reported_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.reported_by, 'Status da ocorrência atualizado',
        'Sua ocorrência no poste ' || COALESCE(v_pole_code,'N/A') || ' está agora: ' || NEW.status || '.',
        'status_ocorrencia');
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_maintenance ON public.maintenances;
CREATE TRIGGER trg_notify_maintenance
AFTER INSERT OR UPDATE ON public.maintenances
FOR EACH ROW EXECUTE FUNCTION public.notify_on_maintenance_events();

-- Notify admins when a resident sends a support message
CREATE OR REPLACE FUNCTION public.notify_admin_on_support_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.sender_type = 'morador' OR NEW.sender_type = 'consumidor' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT ur.user_id, 'Nova mensagem de morador',
      LEFT(NEW.message, 120), 'nova_mensagem'
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_support_msg ON public.support_messages;
CREATE TRIGGER trg_notify_support_msg
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_support_message();

-- Notify admins when a new evaluation is submitted
CREATE OR REPLACE FUNCTION public.notify_admin_on_evaluation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT ur.user_id, 'Nova avaliação recebida',
    'Nova avaliação (' || COALESCE(NEW.rating::text,'?') || '★) foi registrada.',
    'nova_avaliacao'
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_evaluation ON public.evaluations;
CREATE TRIGGER trg_notify_evaluation
AFTER INSERT ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_evaluation();
