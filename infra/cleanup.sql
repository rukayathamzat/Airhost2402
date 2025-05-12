-- Désactiver temporairement les contraintes de clés étrangères
SET session_replication_role = 'replica';

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Hosts can only access their own data" ON public.hosts;
DROP POLICY IF EXISTS "Properties belong to hosts" ON public.properties;
DROP POLICY IF EXISTS "Conversations belong to property owners" ON public.conversations;
DROP POLICY IF EXISTS "Messages belong to conversation owners" ON public.messages;
DROP POLICY IF EXISTS "Templates belong to hosts" ON public.templates;
DROP POLICY IF EXISTS "FAQs belong to property owners" ON public.faqs;

-- Supprimer les tables dans l'ordre (pour éviter les problèmes de clés étrangères)
DROP TABLE IF EXISTS public.faqs;
DROP TABLE IF EXISTS public.templates;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.conversations;
DROP TABLE IF EXISTS public.properties;
DROP TABLE IF EXISTS public.hosts;

-- Réactiver les contraintes de clés étrangères
SET session_replication_role = 'origin';
