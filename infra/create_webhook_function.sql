-- Créer la fonction de webhook
CREATE OR REPLACE FUNCTION handle_whatsapp_webhook(
    request_body JSONB,
    verify_token TEXT DEFAULT NULL
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conversation_record RECORD;
    message_record RECORD;
BEGIN
    -- Si c'est une vérification de webhook
    IF verify_token IS NOT NULL THEN
        IF verify_token != current_setting('app.whatsapp_verify_token', TRUE) THEN
            RAISE EXCEPTION 'Invalid verification token';
        END IF;
        RETURN;
    END IF;

    -- Traitement des messages entrants
    IF request_body->>'object' = 'whatsapp_business_account' THEN
        FOR message_record IN 
            SELECT * FROM jsonb_array_elements(request_body->'entry') AS entry,
                     jsonb_array_elements(entry->'changes') AS change,
                     jsonb_array_elements(change->'value'->'messages') AS message
        LOOP
            -- Trouver ou créer la conversation
            SELECT * INTO conversation_record
            FROM conversations
            WHERE guest_phone = message_record.message->>'from'
            LIMIT 1;

            IF conversation_record IS NULL THEN
                RAISE NOTICE 'No conversation found for phone: %', message_record.message->>'from';
                CONTINUE;
            END IF;

            -- Insérer le message
            INSERT INTO messages (
                conversation_id,
                content,
                direction,
                status,
                whatsapp_message_id
            ) VALUES (
                conversation_record.id,
                message_record.message->'text'->>'body',
                'inbound',
                'received',
                message_record.message->>'id'
            );

            -- Mettre à jour last_message_at
            UPDATE conversations
            SET last_message_at = NOW()
            WHERE id = conversation_record.id;
        END LOOP;
    END IF;
END;
$$;

-- Créer l'API endpoint pour le webhook
CREATE OR REPLACE FUNCTION http_whatsapp_webhook(request http_request)
RETURNS http_response
LANGUAGE plpgsql
AS $$
DECLARE
    verify_token TEXT;
    challenge TEXT;
BEGIN
    -- Vérification du webhook (GET)
    IF request.method = 'GET' THEN
        verify_token := (SELECT value 
                        FROM http_parameters(request.search_query) 
                        WHERE key = 'hub.verify_token');
        challenge := (SELECT value 
                     FROM http_parameters(request.search_query) 
                     WHERE key = 'hub.challenge');
                     
        IF verify_token IS NOT NULL THEN
            PERFORM handle_whatsapp_webhook(NULL, verify_token);
            RETURN http_response(challenge);
        END IF;
    END IF;

    -- Messages entrants (POST)
    IF request.method = 'POST' THEN
        PERFORM handle_whatsapp_webhook(request.content::jsonb);
        RETURN http_response('OK');
    END IF;

    RETURN http_response(status_code => 405);
END;
$$;
