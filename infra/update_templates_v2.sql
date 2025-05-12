-- Ajouter la colonne language à la table templates
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr';

-- Ajouter une contrainte d'unicité sur le nom du template
ALTER TABLE templates
ADD CONSTRAINT templates_name_key UNIQUE (name);

-- Insérer quelques templates de test
INSERT INTO templates (name, content, variables, language)
VALUES 
    ('welcome', 'Bonjour {{guest_name}}, bienvenue ! Je suis {{host_name}}, votre hôte pour votre séjour à {{property_name}}. Je suis là pour vous aider à passer un excellent séjour.', 
    '{"guest_name": "string", "host_name": "string", "property_name": "string"}', 'fr'),
    ('check_in_reminder', 'Bonjour {{guest_name}}, votre check-in à {{property_name}} est prévu pour demain à {{check_in_time}}. Avez-vous besoin d''informations supplémentaires ?',
    '{"guest_name": "string", "property_name": "string", "check_in_time": "string"}', 'fr'),
    ('check_out_reminder', 'Bonjour {{guest_name}}, n''oubliez pas que le check-out est prévu pour demain à {{check_out_time}}. Passez une excellente dernière soirée !',
    '{"guest_name": "string", "check_out_time": "string"}', 'fr')
ON CONFLICT (name) DO UPDATE 
SET 
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    language = EXCLUDED.language;
