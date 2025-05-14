-- Créer la propriété de test pour l'utilisateur actuel
INSERT INTO public.properties (
    host_id,
    name,
    description,
    address
) VALUES (
    '0435270b-61d3-468e-92df-2fbbb55d77b2',  -- Votre ID utilisateur
    'Appartement Paris Centre',
    'Bel appartement au cœur de Paris',
    '123 Rue de Rivoli, 75001 Paris'
) ON CONFLICT (id) DO NOTHING
RETURNING id;

-- Créer la première conversation (récente)
WITH new_conversation AS (
    INSERT INTO public.conversations (
        host_id,
        guest_number,
        property_id,
        last_message,
        last_message_at,
        unread_count
    ) VALUES (
        '0435270b-61d3-468e-92df-2fbbb55d77b2',  -- Votre ID utilisateur
        '33612345678',
        (SELECT id FROM public.properties WHERE host_id = '0435270b-61d3-468e-92df-2fbbb55d77b2' LIMIT 1),
        'Bonjour, je suis intéressé par votre appartement',
        NOW() - INTERVAL '1 hour',
        1
    ) RETURNING id
)
INSERT INTO public.messages (
    conversation_id,
    content,
    direction,
    status
) VALUES (
    (SELECT id FROM new_conversation),
    'Bonjour, je suis intéressé par votre appartement',
    'inbound',
    'delivered'
);

-- Créer la deuxième conversation (ancienne)
WITH new_conversation AS (
    INSERT INTO public.conversations (
        host_id,
        guest_number,
        property_id,
        last_message,
        last_message_at,
        unread_count
    ) VALUES (
        '0435270b-61d3-468e-92df-2fbbb55d77b2',  -- Votre ID utilisateur
        '33698765432',
        (SELECT id FROM public.properties WHERE host_id = '0435270b-61d3-468e-92df-2fbbb55d77b2' LIMIT 1),
        'Merci pour votre réponse',
        NOW() - INTERVAL '2 days',
        0
    ) RETURNING id
)
INSERT INTO public.messages (
    conversation_id,
    content,
    direction,
    status
) 
SELECT 
    id,
    message,
    direction,
    'delivered'
FROM new_conversation,
(VALUES 
    ('Bonjour, est-ce que l''appartement est disponible pour juillet ?', 'inbound'),
    ('Oui, l''appartement est disponible en juillet. Quelles sont vos dates exactes ?', 'outbound'),
    ('Merci pour votre réponse', 'inbound')
) AS messages(message, direction);
