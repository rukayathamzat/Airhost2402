-- Ajouter la clé étrangère entre conversations et apartments
ALTER TABLE conversations
ADD CONSTRAINT conversations_property_id_fkey
FOREIGN KEY (property_id)
REFERENCES apartments(id)
ON DELETE SET NULL;
