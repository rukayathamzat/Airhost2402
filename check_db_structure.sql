-- 1. Vérifier la configuration Realtime
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 2. Vérifier les politiques RLS 
SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename, policyname;

-- 3. Vérifier les triggers existants
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('conversations', 'messages')
ORDER BY event_object_table, trigger_name;

-- 4. Vérifier les fonctions spécifiques aux webhooks et messaging
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN l.lanname = 'internal' THEN p.prosrc
        ELSE pg_get_functiondef(p.oid)
    END as definition
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND p.proname LIKE '%webhook%' OR p.proname LIKE '%whatsapp%' OR p.proname LIKE '%message%';
