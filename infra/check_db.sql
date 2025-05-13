-- Vérifier les extensions
SELECT * FROM pg_extension;

-- Vérifier les tables existantes dans le schéma public
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Vérifier si l'extension uuid-ossp est disponible
SELECT EXISTS (
    SELECT 1 
    FROM pg_available_extensions 
    WHERE name = 'uuid-ossp'
);
