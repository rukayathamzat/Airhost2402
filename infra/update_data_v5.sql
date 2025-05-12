-- D'abord, vérifions si l'utilisateur existe déjà dans la table hosts
INSERT INTO public.hosts (id, email, created_at)
SELECT 
    '0435270b-61d3-468e-92df-2fbbb55d77b2',  -- Votre ID utilisateur comme host_id
    'alexandre.errasti@gmail.com',  -- Votre email
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.hosts 
    WHERE id = '0435270b-61d3-468e-92df-2fbbb55d77b2'
);

-- Ensuite, mettre à jour le host_id dans les propriétés
UPDATE public.properties
SET host_id = '0435270b-61d3-468e-92df-2fbbb55d77b2'  -- Votre ID utilisateur
WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff';  -- Ancien ID utilisateur

-- Mettre à jour le host_id dans les conversations
UPDATE public.conversations
SET host_id = '0435270b-61d3-468e-92df-2fbbb55d77b2'  -- Votre ID utilisateur
WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff';  -- Ancien ID utilisateur

-- Vérifier les mises à jour
WITH messages_json AS (
    SELECT 
        m.conversation_id,
        json_agg(
            json_build_object(
                'content', m.content,
                'direction', m.direction,
                'created_at', m.created_at
            )
            ORDER BY m.created_at DESC
        ) as messages
    FROM public.messages m
    GROUP BY m.conversation_id
)
SELECT 
    h.email as host_email,
    h.phone_number_id,
    h.whatsapp_access_token,
    c.id as conversation_id,
    c.guest_number,
    c.last_message,
    c.last_message_at,
    c.unread_count,
    p.name as property_name,
    mj.messages
FROM public.conversations c
JOIN public.properties p ON c.property_id = p.id
JOIN public.hosts h ON c.host_id = h.id
LEFT JOIN messages_json mj ON c.id = mj.conversation_id;
