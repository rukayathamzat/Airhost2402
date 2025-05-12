-- Insérer un host pour l'utilisateur connecté
INSERT INTO hosts (id, email, phone_number_id, whatsapp_access_token)
VALUES 
    ('7d3ca44d-f2d2-4109-8885-8ef004ee63ff', 'expertiaen5min@gmail.com', '123456789', 'test_token')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email,
    phone_number_id = EXCLUDED.phone_number_id,
    whatsapp_access_token = EXCLUDED.whatsapp_access_token;

-- Insérer des propriétés de test
INSERT INTO properties (id, host_id, name, address)
VALUES 
    (gen_random_uuid(), '7d3ca44d-f2d2-4109-8885-8ef004ee63ff', 'Villa Méditerranée', '123 Avenue de la Plage, Nice'),
    (gen_random_uuid(), '7d3ca44d-f2d2-4109-8885-8ef004ee63ff', 'Appartement Paris Centre', '45 Rue du Commerce, Paris')
ON CONFLICT (id) DO NOTHING;

-- Insérer des conversations de test
WITH prop AS (
    SELECT id FROM properties WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' LIMIT 1
)
INSERT INTO conversations (
    id,
    property_id,
    guest_name,
    guest_phone,
    check_in_date,
    check_out_date,
    status,
    last_message_at
)
SELECT 
    gen_random_uuid(),
    prop.id,
    'Jean Dupont',
    '33612345678',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '14 days',
    'active',
    CURRENT_TIMESTAMP
FROM prop
UNION ALL
SELECT 
    gen_random_uuid(),
    prop.id,
    'Marie Martin',
    '33687654321',
    CURRENT_DATE + INTERVAL '21 days',
    CURRENT_DATE + INTERVAL '28 days',
    'active',
    CURRENT_TIMESTAMP
FROM prop;

-- Insérer des messages de test
WITH conv AS (
    SELECT id FROM conversations ORDER BY last_message_at DESC LIMIT 1
)
INSERT INTO messages (
    id,
    conversation_id,
    content,
    direction,
    status,
    created_at
)
SELECT 
    gen_random_uuid(),
    conv.id,
    'Bonjour, je suis intéressé par votre logement',
    'inbound',
    'delivered',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
FROM conv
UNION ALL
SELECT 
    gen_random_uuid(),
    conv.id,
    'Bien sûr, je peux vous donner plus d''informations. Quand souhaitez-vous séjourner ?',
    'outbound',
    'delivered',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes'
FROM conv;
