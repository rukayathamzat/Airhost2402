DO $$ 
DECLARE
    _sql text;
BEGIN
    -- Supprimer les tables si elles existent
    FOR _sql IN 
        SELECT 'DROP TABLE IF EXISTS ' || quote_ident(tablename) || ' CASCADE;'
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('messages', 'templates', 'conversations', 'properties', 'hosts', 'faqs')
    LOOP
        EXECUTE _sql;
    END LOOP;

    -- Supprimer les politiques si elles existent
    FOR _sql IN 
        SELECT 'DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) || ';'
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE _sql;
    END LOOP;
END $$;
