-- Supprimer et recréer la table templates
DROP TABLE IF EXISTS templates;

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    namespace TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    variables JSONB,
    language TEXT NOT NULL DEFAULT 'fr',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(namespace, name)
);

-- Insérer les templates
INSERT INTO templates (namespace, name, content, variables, language)
VALUES 
    ('airhost', 'welcome', 'Bonjour {{guest_name}}, bienvenue ! Je suis {{host_name}}, votre hôte pour votre séjour à {{property_name}}. Je suis là pour vous aider à passer un excellent séjour.', 
    '{"guest_name": "string", "host_name": "string", "property_name": "string"}', 'fr'),
    
    ('airhost', 'check_in_reminder', 'Bonjour {{guest_name}}, votre check-in à {{property_name}} est prévu pour demain à {{check_in_time}}. Avez-vous besoin d''informations supplémentaires ?',
    '{"guest_name": "string", "property_name": "string", "check_in_time": "string"}', 'fr'),
    
    ('airhost', 'check_out_reminder', 'Bonjour {{guest_name}}, n''oubliez pas que le check-out est prévu pour demain à {{check_out_time}}. Passez une excellente dernière soirée !',
    '{"guest_name": "string", "check_out_time": "string"}', 'fr');
