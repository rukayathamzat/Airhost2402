-- Supprimer les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS faqs CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS hosts CASCADE;

-- Supprimer les politiques de sécurité RLS si elles existent
DROP POLICY IF EXISTS "FAQs belong to property owners" ON faqs;
DROP POLICY IF EXISTS "Properties belong to hosts" ON properties;
DROP POLICY IF EXISTS "Conversations belong to property owners" ON conversations;
DROP POLICY IF EXISTS "Messages belong to conversation participants" ON messages;
