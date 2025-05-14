-- Créer quelques conversations de test
WITH new_conversation AS (
  INSERT INTO conversations (
    host_id,
    guest_number,
    property_id,
    last_message,
    last_message_at,
    unread_count
  ) VALUES (
    '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',  -- votre ID
    '33612345678',
    (SELECT id FROM properties WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' LIMIT 1),
    'Bonjour, je suis intéressé par votre appartement',
    NOW() - INTERVAL '1 hour',
    1
  ) RETURNING id
)
INSERT INTO messages (
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

-- Créer une deuxième conversation plus ancienne
WITH new_conversation AS (
  INSERT INTO conversations (
    host_id,
    guest_number,
    property_id,
    last_message,
    last_message_at,
    unread_count
  ) VALUES (
    '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',  -- votre ID
    '33698765432',
    (SELECT id FROM properties WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' LIMIT 1),
    'Merci pour votre réponse',
    NOW() - INTERVAL '2 days',
    0
  ) RETURNING id
)
INSERT INTO messages (
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

-- Créer quelques templates de message
INSERT INTO templates (
  namespace,
  name,
  language,
  content
) VALUES 
  ('customer_support', 'welcome', 'fr', 'Bonjour ! Je suis {{1}}, votre hôte pour {{2}}. Comment puis-je vous aider ?'),
  ('customer_support', 'booking_confirmed', 'fr', 'Votre réservation pour {{1}} est confirmée. Voici les détails : {{2}}'),
  ('customer_support', 'conversation_expired', 'fr', 'La conversation a expiré. Pour continuer, veuillez envoyer un nouveau message.');
