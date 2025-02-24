-- Mettre à jour les informations WhatsApp pour votre compte
UPDATE public.hosts
SET 
    phone_number_id = '123456789',  -- À remplacer par votre vrai phone_number_id Meta
    whatsapp_access_token = 'EAAxxxx',  -- À remplacer par votre vrai token Meta
    verify_token = 'mon_token_secret'  -- Token personnalisé pour la vérification webhook
WHERE id = '0435270b-61d3-468e-92df-2fbbb55d77b2';

-- Vérifier les mises à jour
SELECT 
    id,
    email,
    phone_number_id,
    whatsapp_access_token,
    verify_token,
    created_at
FROM public.hosts
WHERE id = '0435270b-61d3-468e-92df-2fbbb55d77b2';
