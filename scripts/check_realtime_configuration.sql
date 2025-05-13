-- Script pour vérifier la configuration Realtime des tables Supabase
-- Exécuter ce script dans l'éditeur SQL de Supabase pour vérifier l'état de Realtime

-- 1. Vérifier quelles tables sont incluses dans la publication Realtime
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 2. Vérifier si la table conversations a des politiques RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'conversations';

-- 3. Vérifier si la table messages a des politiques RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'messages';
