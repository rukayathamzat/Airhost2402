-- Créer la table des templates
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    namespace TEXT NOT NULL,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(namespace, name, language)
);

-- Ajouter les politiques RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les hôtes peuvent lire les templates"
    ON public.templates FOR SELECT
    TO authenticated
    USING (true);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
