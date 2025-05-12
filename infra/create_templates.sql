-- Insérer les templates WhatsApp
INSERT INTO public.templates (id, namespace, name, language, content, created_at)
VALUES 
    (
        gen_random_uuid(),
        'airhost',
        'welcome',
        'fr',
        'Bonjour ! Je suis {{1}}, l''hôte de {{2}}. Je suis ravi(e) de vous accueillir. Comment puis-je vous aider ?',
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'airhost',
        'booking_confirmation',
        'fr',
        'Votre réservation pour {{1}} du {{2}} au {{3}} est confirmée. Voici les détails d''accès : {{4}}',
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'airhost',
        'checkout_reminder',
        'fr',
        'Rappel : le check-out est prévu demain à {{1}}. N''oubliez pas de laisser les clés {{2}}',
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        'airhost',
        'recontact',
        'fr',
        'Bonjour ! Je fais suite à notre conversation précédente concernant {{1}}. Avez-vous besoin d''informations supplémentaires ?',
        CURRENT_TIMESTAMP
    );

-- Vérifier les templates créés
SELECT * FROM public.templates ORDER BY created_at DESC;
