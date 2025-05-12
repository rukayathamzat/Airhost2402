-- Afficher tous les utilisateurs
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users;
