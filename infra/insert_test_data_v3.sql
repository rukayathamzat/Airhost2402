-- Insérer un host pour l'utilisateur connecté (si pas déjà présent)
INSERT INTO hosts (id, email, phone_number_id, whatsapp_access_token)
VALUES 
    ('7d3ca44d-f2d2-4109-8885-8ef004ee63ff', 'expertiaen5min@gmail.com', '123456789', 'test_token')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email,
    phone_number_id = EXCLUDED.phone_number_id,
    whatsapp_access_token = EXCLUDED.whatsapp_access_token;

-- Insérer des propriétés de test (si pas déjà présentes)
WITH new_properties AS (
    SELECT 
        '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' as host_id,
        unnest(ARRAY[
            ROW('Villa Méditerranée', '123 Avenue de la Plage, Nice'),
            ROW('Appartement Paris Centre', '45 Rue du Commerce, Paris')
        ]::record[]) as prop(name, address)
)
INSERT INTO properties (host_id, name, address)
SELECT host_id, prop.name, prop.address
FROM new_properties
ON CONFLICT DO NOTHING;

-- Insérer des conversations de test
WITH first_property AS (
    SELECT id FROM properties 
    WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' 
    ORDER BY created_at ASC
    LIMIT 1
),
new_conversations AS (
    SELECT 
        first_property.id as property_id,
        unnest(ARRAY[
            ROW('Jean Dupont', '33612345678', 7, 14),
            ROW('Marie Martin', '33687654321', 21, 28)
        ]::record[]) as conv(guest_name, guest_phone, checkin_offset, checkout_offset)
    FROM first_property
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
    property_id,
    conv.guest_name,
    conv.guest_phone,
    CURRENT_DATE + (conv.checkin_offset || ' days')::interval,
    CURRENT_DATE + (conv.checkout_offset || ' days')::interval,
    'active',
    CURRENT_TIMESTAMP - (random() * interval '1 hour')
FROM new_conversations
ON CONFLICT DO NOTHING;
