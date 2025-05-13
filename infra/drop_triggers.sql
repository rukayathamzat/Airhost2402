-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS update_hosts_updated_at ON hosts;
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;

-- Supprimer la fonction trigger
DROP FUNCTION IF EXISTS update_updated_at_column();
