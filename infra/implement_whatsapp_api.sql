-- Activer l'extension pg_net si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fonction pour envoyer une requête à l'API WhatsApp
CREATE OR REPLACE FUNCTION public.send_whatsapp_request(
    p_phone_number_id text,
    p_access_token text,
    p_payload json
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request_id bigint;
    v_response_id bigint;
    v_response json;
    v_status text;
    v_retries integer := 0;
    v_max_retries constant integer := 3;
BEGIN
    -- Envoyer la requête HTTP
    SELECT net_request_id INTO v_request_id FROM net_http_post(
        url := format('https://graph.facebook.com/v19.0/%s/messages', p_phone_number_id),
        headers := jsonb_build_object(
            'Authorization', format('Bearer %s', p_access_token),
            'Content-Type', 'application/json'
        ),
        body := p_payload::text
    );

    -- Attendre et récupérer la réponse
    WHILE v_retries < v_max_retries LOOP
        SELECT 
            response_id,
            status
        INTO 
            v_response_id,
            v_status
        FROM net_http_get_status(v_request_id);

        IF v_status = 'DONE' THEN
            SELECT response_body::json
            INTO v_response
            FROM net_http_get_response(v_response_id);
            RETURN v_response;
        ELSIF v_status = 'ERROR' THEN
            RAISE EXCEPTION 'WhatsApp API request failed';
        END IF;

        v_retries := v_retries + 1;
        PERFORM pg_sleep(1); -- Attendre 1 seconde entre les tentatives
    END LOOP;

    RAISE EXCEPTION 'WhatsApp API request timed out';
END;
$$;

-- Mettre à jour la fonction send_whatsapp_message pour utiliser l'API
CREATE OR REPLACE FUNCTION public.send_whatsapp_message(
    p_conversation_id uuid,
    p_content text,
    p_template_name text DEFAULT NULL,
    p_template_namespace text DEFAULT NULL,
    p_template_components json DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conversation record;
    v_host record;
    v_within_24h boolean;
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

    -- Construire le payload selon le type de message
    IF p_template_name IS NOT NULL AND p_template_namespace IS NOT NULL THEN
        v_payload := json_build_object(
            'messaging_product', 'whatsapp',
            'to', v_conversation.guest_number,
            'type', 'template',
            'template', json_build_object(
                'name', p_template_name,
                'language', json_build_object('code', 'fr'),
                'namespace', p_template_namespace,
                'components', COALESCE(p_template_components, '[]'::json)
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

    -- Envoyer la requête à l'API WhatsApp
    v_response := public.send_whatsapp_request(
        v_conversation.phone_number_id,
        v_conversation.whatsapp_access_token,
        v_payload
    );

    -- Mettre à jour le statut du message
    UPDATE public.messages
    SET 
        status = CASE 
            WHEN v_response->>'error' IS NOT NULL THEN 'failed'
            ELSE 'sent'
        END,
        external_id = COALESCE(
            v_response->'messages'->0->>'id',
            v_message_id::text
        )
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

-- Tester l'envoi d'un message direct (dans la fenêtre de 24h)
SELECT public.send_whatsapp_message(
    'f8859b0a-30ee-4bf4-91ab-18f37f8262f4',  -- ID de la conversation de test
    'Ceci est un message de test'
);

-- Tester l'envoi d'un template
SELECT public.send_whatsapp_message(
    'f8859b0a-30ee-4bf4-91ab-18f37f8262f4',  -- ID de la conversation de test
    'Bienvenue !',  -- Ce texte sera ignoré car on utilise un template
    'welcome',  -- Nom du template
    'airhost',  -- Namespace du template
    '[{"type":"body","parameters":[{"type":"text","text":"Alexandre"},{"type":"text","text":"Appartement Test"}]}]'::json  -- Composants du template
);
