-- Vérifier les paramètres d'authentification
SELECT 
    raw_app_meta_config->>'SITE_URL' as site_url,
    raw_app_meta_config->>'MAILER_SECURE_EMAIL_CHANGE_ENABLED' as secure_email_change,
    raw_app_meta_config->>'MAILER_SECURE_PASSWORD_RESET_ENABLED' as secure_password_reset
FROM auth.config;

-- Mettre à jour l'URL du site
UPDATE auth.config
SET raw_app_meta_config = raw_app_meta_config || 
    jsonb_build_object(
        'SITE_URL', 'http://localhost:5173',
        'MAILER_SECURE_PASSWORD_RESET_ENABLED', true,
        'ADDITIONAL_REDIRECT_URLS', '["http://localhost:5173/reset-password"]'
    );

-- Vérifier les templates d'email
SELECT * FROM auth.mfa_factors;
