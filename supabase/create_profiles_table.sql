-- Création de la table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Créer une policy pour permettre aux utilisateurs de lire leur propre profil
CREATE POLICY "Les utilisateurs peuvent lire leur propre profil"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Créer une policy pour permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Créer une policy pour permettre à l'application de créer des profils
CREATE POLICY "L'application peut créer des profils"
    ON public.profiles
    FOR INSERT
    WITH CHECK (true);

-- Créer une fonction pour gérer la création automatique de profils
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer un trigger pour appeler la fonction lors de la création d'un nouvel utilisateur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
