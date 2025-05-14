-- Migration pour mettre à jour la table templates
BEGIN;

-- Ajout de colonnes manquantes
DO $$ 
BEGIN
    -- Ajout de la colonne description si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='templates' AND column_name='description') THEN
        ALTER TABLE templates ADD COLUMN description TEXT;
    END IF;

    -- Ajout de la colonne updated_at si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='templates' AND column_name='updated_at') THEN
        ALTER TABLE templates ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Mise à jour des templates existants
DELETE FROM templates WHERE name IN ('hello_world', 'bienvenue');

-- Insertion des templates par défaut
INSERT INTO templates (name, content, language, variables, description) 
VALUES 
    ('hello_world', 'Hello! Welcome to our property.', 'en_US', '{}'::jsonb, 'Template de bienvenue en anglais'),
    ('bienvenue', 'Bonjour! Bienvenue dans notre propriété.', 'fr', '{}'::jsonb, 'Template de bienvenue en français');

COMMIT;
