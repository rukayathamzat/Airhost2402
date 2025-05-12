-- Migration pour ajouter la table de configuration WhatsApp
-- Date: 2024-02-22

BEGIN;

-- Création de la table whatsapp_config
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_id TEXT NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_whatsapp_config_updated_at
    BEFORE UPDATE ON whatsapp_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Activation de RLS
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Politique pour whatsapp_config (seuls les admins peuvent gérer la config)
CREATE POLICY "Admins can manage WhatsApp config"
    ON whatsapp_config FOR ALL
    USING (
        auth.uid() IN (
            SELECT auth.uid() FROM auth.users
            WHERE auth.email() IN (
                SELECT unnest(current_setting('app.admin_emails')::text[])
            )
        )
    );

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_updated_at ON whatsapp_config(updated_at DESC);

COMMIT;
