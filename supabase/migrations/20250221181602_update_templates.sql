-- Supprimer tous les templates existants
DELETE FROM templates;

-- Insérer uniquement les templates bienvenue et hello_world
INSERT INTO templates (name, content, variables, language)
VALUES 
  ('bienvenue', 'Bonjour! Bienvenue dans notre propriété.', '{}', 'fr'),
  ('hello_world', 'Hello! Welcome to our property.', '{}', 'en_US');
