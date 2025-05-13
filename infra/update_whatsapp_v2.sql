-- Mettre à jour les informations WhatsApp pour votre compte
UPDATE public.hosts
SET 
    phone_number_id = '477925252079395',
    whatsapp_access_token = 'EAAX0gXt8e64BOZBb4ZAMuO8z44g34CskAtvYP3tMPA0Imnve1rGLcWL74HjgtofZAgE754xabWE0hYS31TYXkmyH0dT1ZAzp9QsCuNu8nRhxXWIrzZBj1xZAjOV91toNH2qNJ6sAgHcjAfUt1qglZCFlkZBadthENJE9bJjsXNEmGYyQF02tSI6bSArg9sPmWoGhrLjZBtXgcZCKsGl5ZCk0MUcQvTy',
    verify_token = 'airhost_webhook_verify_token'  -- Token personnalisé pour la vérification webhook
WHERE id = '0435270b-61d3-468e-92df-2fbbb55d77b2';

-- Vérifier les mises à jour
SELECT 
    id,
    email,
    phone_number_id,
    substr(whatsapp_access_token, 1, 10) || '...' as whatsapp_access_token_preview,
    verify_token,
    created_at
FROM public.hosts
WHERE id = '0435270b-61d3-468e-92df-2fbbb55d77b2';

-- Mettre à jour le numéro de test dans une conversation
UPDATE public.conversations
SET guest_number = '+33617370484'
WHERE id = 'f8859b0a-30ee-4bf4-91ab-18f37f8262f4'
RETURNING id, guest_number, last_message;
