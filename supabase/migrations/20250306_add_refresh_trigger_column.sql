-- Ajouter une colonne _refresh_trigger pour forcer les mises à jour Realtime
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS _refresh_trigger text;

-- S'assurer que la publication inclut toujours la table conversations
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
