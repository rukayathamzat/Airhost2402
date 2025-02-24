-- Insérer un host pour l'utilisateur connecté (si pas déjà présent)
INSERT INTO hosts (id, email, phone_number_id, whatsapp_access_token)
VALUES 
    ('7d3ca44d-f2d2-4109-8885-8ef004ee63ff', 'expertiaen5min@gmail.com', '123456789', 'test_token')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email,
    phone_number_id = EXCLUDED.phone_number_id,
    whatsapp_access_token = EXCLUDED.whatsapp_access_token;

-- Insérer des propriétés de test (si pas déjà présentes)
INSERT INTO properties (host_id, name, address)
SELECT 
    '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
    'Villa Méditerranée',
    '123 Avenue de la Plage, Nice'
WHERE NOT EXISTS (
    SELECT 1 FROM properties 
    WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' 
    AND name = 'Villa Méditerranée'
);

INSERT INTO properties (host_id, name, address)
SELECT 
    '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
    'Appartement Paris Centre',
    '45 Rue du Commerce, Paris'
WHERE NOT EXISTS (
    SELECT 1 FROM properties 
    WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' 
    AND name = 'Appartement Paris Centre'
);

-- Insérer des conversations de test
WITH first_property AS (
    SELECT id FROM properties 
    WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' 
    LIMIT 1
)
INSERT INTO conversations (
    property_id,
    guest_name,
    guest_phone,
    check_in_date,
    check_out_date,
    status,
    last_message_at
)
SELECT 
    first_property.id,
    'Jean Dupont',
    '33612345678',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '14 days',
    'active',
    CURRENT_TIMESTAMP
FROM first_property
WHERE NOT EXISTS (
    SELECT 1 FROM conversations c 
    JOIN properties p ON c.property_id = p.id 
    WHERE p.host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff'
    AND c.guest_name = 'Jean Dupont'
);

-- Insérer une deuxième conversation
WITH first_property AS (
    SELECT id FROM properties 
    WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' 
    LIMIT 1
)
INSERT INTO conversations (
    property_id,
    guest_name,
    guest_phone,
    check_in_date,
    check_out_date,
    status,
    last_message_at
)
SELECT 
    first_property.id,
    'Marie Martin',
    '33687654321',
    CURRENT_DATE + INTERVAL '21 days',
    CURRENT_DATE + INTERVAL '28 days',
    'active',
    CURRENT_TIMESTAMP
FROM first_property
WHERE NOT EXISTS (
    SELECT 1 FROM conversations c 
    JOIN properties p ON c.property_id = p.id 
    WHERE p.host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff'
    AND c.guest_name = 'Marie Martin'
);
