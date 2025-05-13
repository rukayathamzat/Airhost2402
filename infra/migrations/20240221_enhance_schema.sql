-- Migration pour améliorer la scalabilité de la base de données
-- Date: 2024-02-21

BEGIN;

-- 1. Ajout des colonnes à la table properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS ai_instructions TEXT,
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS check_in_instructions TEXT,
ADD COLUMN IF NOT EXISTS house_rules TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Création de la table property_ai_configs
CREATE TABLE IF NOT EXISTS property_ai_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    prompt_template TEXT,
    context TEXT,
    allowed_actions JSONB DEFAULT '[]',
    custom_instructions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_property_ai_configs_updated_at
    BEFORE UPDATE ON property_ai_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Création de la table media
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('image', 'document', 'video')),
    url TEXT NOT NULL,
    filename TEXT,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Création de la table property_templates
CREATE TABLE IF NOT EXISTS property_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    custom_variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_property_templates_updated_at
    BEFORE UPDATE ON property_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Modification de la table messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'template', 'media', 'location')),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id),
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- 6. Création des index
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_property_templates_property_id ON property_templates(property_id);
CREATE INDEX IF NOT EXISTS idx_media_message_id ON media(message_id);
CREATE INDEX IF NOT EXISTS idx_media_property_id ON media(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ai_configs_property_id ON property_ai_configs(property_id);

-- 7. Création des politiques de sécurité RLS (Row Level Security)
ALTER TABLE property_ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_templates ENABLE ROW LEVEL SECURITY;

-- Politique pour property_ai_configs
CREATE POLICY "Users can view their own property AI configs"
    ON property_ai_configs FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own property AI configs"
    ON property_ai_configs FOR ALL
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- Politique pour media
CREATE POLICY "Users can view their own media"
    ON media FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own media"
    ON media FOR ALL
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- Politique pour property_templates
CREATE POLICY "Users can view their own property templates"
    ON property_templates FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own property templates"
    ON property_templates FOR ALL
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

COMMIT;
