-- Mettre à jour l'URL du site et les redirections autorisées
UPDATE auth.config
SET raw_app_meta_config = raw_app_meta_config || 
    jsonb_build_object(
        'SITE_URL', 'http://localhost:5174',
        'ADDITIONAL_REDIRECT_URLS', '["http://localhost:5174", "http://localhost:5174/set-password"]'
    );
