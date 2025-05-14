-- Fonction pour envoyer un message WhatsApp
CREATE OR REPLACE FUNCTION send_whatsapp_message(
    p_conversation_id UUID,
    p_content TEXT
) RETURNS void AS $$
DECLARE
    v_guest_phone TEXT;
    v_last_message_at TIMESTAMP WITH TIME ZONE;
    v_hours_since_last_message NUMERIC;
BEGIN
    -- Récupérer le numéro de téléphone et la date du dernier message
    SELECT 
        c.guest_phone,
        c.last_message_at
    INTO 
        v_guest_phone,
        v_last_message_at
    FROM conversations c
    WHERE c.id = p_conversation_id;

    -- Vérifier la fenêtre de 24h
    v_hours_since_last_message := EXTRACT(EPOCH FROM (NOW() - v_last_message_at)) / 3600;
    
    IF v_hours_since_last_message > 24 THEN
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

    -- Mettre à jour last_message_at dans la conversation
    UPDATE conversations 
    SET last_message_at = NOW()
    WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour envoyer un template WhatsApp
CREATE OR REPLACE FUNCTION send_whatsapp_template(
    p_conversation_id UUID,
    p_template_namespace TEXT,
    p_template_name TEXT
) RETURNS void AS $$
DECLARE
    v_guest_phone TEXT;
    v_template_content TEXT;
BEGIN
    -- Récupérer le numéro de téléphone
    SELECT guest_phone
    INTO v_guest_phone
    FROM conversations
    WHERE id = p_conversation_id;

    -- Récupérer le contenu du template
    SELECT content
    INTO v_template_content
    FROM templates
    WHERE namespace = p_template_namespace
    AND name = p_template_name;

    IF v_template_content IS NULL THEN
        RAISE EXCEPTION 'Template non trouvé';
    END IF;

    -- Insérer le message dans la base de données
    INSERT INTO messages (
        conversation_id,
        content,
        direction,
        status
    ) VALUES (
        p_conversation_id,
        v_template_content,
        'outbound',
        'pending'
    );

    -- Mettre à jour last_message_at dans la conversation
    UPDATE conversations 
    SET last_message_at = NOW()
    WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql;
