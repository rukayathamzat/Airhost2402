-- Insérer un host pour l'utilisateur connecté (si pas déjà présent)
INSERT INTO hosts (id, email, phone_number_id, whatsapp_access_token)
VALUES 
    ('7d3ca44d-f2d2-4109-8885-8ef004ee63ff', 'expertiaen5min@gmail.com', '123456789', 'test_token')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email,
    phone_number_id = EXCLUDED.phone_number_id,
    whatsapp_access_token = EXCLUDED.whatsapp_access_token;

-- Insérer la première propriété
INSERT INTO properties (host_id, name, address)
VALUES 
    ('7d3ca44d-f2d2-4109-8885-8ef004ee63ff', 'Villa Méditerranée', '123 Avenue de la Plage, Nice')
ON CONFLICT DO NOTHING;

-- Insérer la deuxième propriété
INSERT INTO properties (host_id, name, address)
VALUES 
    ('7d3ca44d-f2d2-4109-8885-8ef004ee63ff', 'Appartement Paris Centre', '45 Rue du Commerce, Paris')
ON CONFLICT DO NOTHING;

-- Récupérer l'ID de la première propriété
WITH first_property AS (
    SELECT id 
    FROM properties 
    WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff'
    ORDER BY created_at ASC
    LIMIT 1
)
-- Insérer la première conversation
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
    id as property_id,
    'Jean Dupont',
    '33612345678',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '14 days',
    'active',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
FROM first_property
ON CONFLICT DO NOTHING;

-- Insérer la deuxième conversation
WITH first_property AS (
    SELECT id 
    FROM properties 
    WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff'
    ORDER BY created_at ASC
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
    id as property_id,
    'Marie Martin',
    '33687654321',
    CURRENT_DATE + INTERVAL '21 days',
    CURRENT_DATE + INTERVAL '28 days',
    'active',
    CURRENT_TIMESTAMP
FROM first_property
ON CONFLICT DO NOTHING;
