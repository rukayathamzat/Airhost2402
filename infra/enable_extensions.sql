-- Activer l'extension uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vérifier que l'extension est bien activée
SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
