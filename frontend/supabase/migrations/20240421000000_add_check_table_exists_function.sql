-- Migration pour ajouter une fonction permettant de vérifier l'existence d'une table
-- Utilisée par la fonction de test WhatsApp

-- Créer la fonction check_table_exists qui renvoie true si la table existe
-- et false si elle n'existe pas
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = table_name
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$;

-- Ajouter les permissions pour permettre à tous les utilisateurs d'exécuter cette fonction
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO service_role;

-- Commentaire pour faciliter l'identification
COMMENT ON FUNCTION public.check_table_exists(text) IS 'Vérifie si une table existe dans le schéma public';
