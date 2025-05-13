-- Fonction pour envoyer un message WhatsApp
CREATE OR REPLACE FUNCTION public.send_whatsapp_message(
  p_conversation_id UUID,
  p_content TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_host_id UUID;
  v_guest_number TEXT;
  v_conversation_created_at TIMESTAMP;
  v_hours_diff FLOAT;
BEGIN
  -- Récupérer les informations de la conversation
  SELECT 
    c.host_id,
    c.guest_number,
    c.created_at
  INTO 
    v_host_id,
    v_guest_number,
    v_conversation_created_at
  FROM conversations c
  WHERE c.id = p_conversation_id;

  -- Vérifier la fenêtre de 24h
  v_hours_diff := EXTRACT(EPOCH FROM (NOW() - v_conversation_created_at)) / 3600;
  
  IF v_hours_diff > 24 THEN
    RAISE EXCEPTION 'La fenêtre de 24h est dépassée. Utilisez un template.';
  END IF;

  -- Insérer le message dans la base de données
  INSERT INTO messages (
    conversation_id,
    content,
    direction,
    status
  ) VALUES (
    p_conversation_id,
    p_content,
    'outbound',
    'pending'
  );

  -- Mettre à jour la conversation
  UPDATE conversations
  SET 
    last_message = p_content,
    last_message_at = NOW()
  WHERE id = p_conversation_id;

  -- Note: L'envoi effectif du message WhatsApp sera géré par un worker
END;
$$;

-- Fonction pour envoyer un template WhatsApp
CREATE OR REPLACE FUNCTION public.send_whatsapp_template(
  p_conversation_id UUID,
  p_template_namespace TEXT,
  p_template_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_host_id UUID;
  v_guest_number TEXT;
  v_template_id UUID;
  v_template_content TEXT;
BEGIN
  -- Récupérer les informations de la conversation et du template
  SELECT 
    c.host_id,
    c.guest_number
  INTO 
    v_host_id,
    v_guest_number
  FROM conversations c
  WHERE c.id = p_conversation_id;

  SELECT 
    id,
    content
  INTO 
    v_template_id,
    v_template_content
  FROM templates t
  WHERE t.namespace = p_template_namespace
    AND t.name = p_template_name;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template non trouvé';
  END IF;

  -- Insérer le message dans la base de données
  INSERT INTO messages (
    conversation_id,
    content,
    direction,
    status,
    template_id
  ) VALUES (
    p_conversation_id,
    v_template_content,
    'outbound',
    'pending',
    v_template_id
  );

  -- Mettre à jour la conversation
  UPDATE conversations
  SET 
    last_message = v_template_content,
    last_message_at = NOW()
  WHERE id = p_conversation_id;

  -- Note: L'envoi effectif du message WhatsApp sera géré par un worker
END;
$$;
