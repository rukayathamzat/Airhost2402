-- Fonction pour vérifier si on est dans la fenêtre de 24h
CREATE OR REPLACE FUNCTION public.is_within_24h_window(conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_inbound_at timestamptz;
BEGIN
    SELECT MAX(created_at)
    INTO last_inbound_at
    FROM public.messages
    WHERE conversation_id = $1
    AND direction = 'inbound';
    
    RETURN last_inbound_at IS NOT NULL 
        AND (CURRENT_TIMESTAMP - last_inbound_at) < interval '24 hours';
END;
$$;

-- Fonction pour envoyer un message WhatsApp
CREATE OR REPLACE FUNCTION public.send_whatsapp_message(
    p_conversation_id uuid,
    p_content text,
    p_template_name text DEFAULT NULL,
    p_template_namespace text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conversation record;
    v_host record;
    v_within_24h boolean;
    v_api_url text;
    v_headers text[];
    v_payload json;
    v_response json;
    v_message_id uuid;
BEGIN
    -- Récupérer les informations de la conversation et du host
    SELECT c.*, h.phone_number_id, h.whatsapp_access_token
    INTO v_conversation
    FROM public.conversations c
    JOIN public.hosts h ON c.host_id = h.id
    WHERE c.id = p_conversation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversation not found';
    END IF;

    -- Vérifier la fenêtre de 24h
    v_within_24h := public.is_within_24h_window(p_conversation_id);

    -- Si hors fenêtre de 24h, on doit utiliser un template
    IF NOT v_within_24h AND (p_template_name IS NULL OR p_template_namespace IS NULL) THEN
        RAISE EXCEPTION 'Outside 24h window, template is required';
    END IF;

    -- Créer le message dans la base
    INSERT INTO public.messages (
        id,
        conversation_id,
        content,
        direction,
        status,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_conversation_id,
        p_content,
        'outbound',
        'pending',
        CURRENT_TIMESTAMP
    ) RETURNING id INTO v_message_id;

    -- Construire la requête WhatsApp
    v_api_url := format('https://graph.facebook.com/v19.0/%s/messages', v_conversation.phone_number_id);
    v_headers := ARRAY[
        format('Authorization: Bearer %s', v_conversation.whatsapp_access_token),
        'Content-Type: application/json'
    ];

    -- Construire le payload selon le type de message
    IF p_template_name IS NOT NULL AND p_template_namespace IS NOT NULL THEN
        v_payload := json_build_object(
            'messaging_product', 'whatsapp',
            'to', v_conversation.guest_number,
            'type', 'template',
            'template', json_build_object(
                'name', p_template_name,
                'language', json_build_object('code', 'fr'),
                'namespace', p_template_namespace
            )
        );
    ELSE
        v_payload := json_build_object(
            'messaging_product', 'whatsapp',
            'to', v_conversation.guest_number,
            'type', 'text',
            'text', json_build_object('body', p_content)
        );
    END IF;

    -- Envoyer la requête à l'API WhatsApp (simulation pour l'instant)
    -- TODO: Implémenter l'appel HTTP réel avec pg_net
    v_response := json_build_object(
        'success', true,
        'message_id', v_message_id
    );

    -- Mettre à jour le statut du message
    UPDATE public.messages
    SET status = 'sent',
        external_id = v_message_id::text
    WHERE id = v_message_id;

    -- Mettre à jour la conversation
    UPDATE public.conversations
    SET 
        last_message = p_content,
        last_message_at = CURRENT_TIMESTAMP
    WHERE id = p_conversation_id;

    RETURN v_response;
END;
$$;

-- Fonction pour gérer les webhooks WhatsApp
CREATE OR REPLACE FUNCTION public.handle_whatsapp_webhook(payload json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_entry json;
    v_change json;
    v_value json;
    v_message json;
    v_conversation_id uuid;
    v_host_id uuid;
    v_property_id uuid;
BEGIN
    -- Extraire les informations du webhook
    v_entry := payload -> 'entry' -> 0;
    v_change := v_entry -> 'changes' -> 0;
    v_value := v_change -> 'value';
    v_message := v_value -> 'messages' -> 0;

    -- Trouver ou créer la conversation
    SELECT c.id, c.host_id, c.property_id
    INTO v_conversation_id, v_host_id, v_property_id
    FROM public.conversations c
    WHERE c.guest_number = (v_message ->> 'from');

    IF NOT FOUND THEN
        -- Créer une nouvelle conversation
        -- Pour l'instant, on associe à la première propriété du premier hôte
        SELECT h.id, p.id
        INTO v_host_id, v_property_id
        FROM public.hosts h
        JOIN public.properties p ON p.host_id = h.id
        LIMIT 1;

        INSERT INTO public.conversations (
            id,
            host_id,
            property_id,
            guest_number,
            last_message,
            last_message_at,
            unread_count
        ) VALUES (
            gen_random_uuid(),
            v_host_id,
            v_property_id,
            v_message ->> 'from',
            v_message -> 'text' ->> 'body',
            CURRENT_TIMESTAMP,
            1
        ) RETURNING id INTO v_conversation_id;
    ELSE
        -- Mettre à jour la conversation existante
        UPDATE public.conversations
        SET 
            last_message = v_message -> 'text' ->> 'body',
            last_message_at = CURRENT_TIMESTAMP,
            unread_count = unread_count + 1
        WHERE id = v_conversation_id;
    END IF;

    -- Créer le message
    INSERT INTO public.messages (
        id,
        conversation_id,
        content,
        direction,
        status,
        external_id,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_conversation_id,
        v_message -> 'text' ->> 'body',
        'inbound',
        'delivered',
        v_message ->> 'id',
        CURRENT_TIMESTAMP
    );

    RETURN json_build_object(
        'success', true,
        'conversation_id', v_conversation_id
    );
END;
$$;

-- Fonction pour marquer une conversation comme lue
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.conversations
    SET unread_count = 0
    WHERE id = p_conversation_id;
END;
$$;
