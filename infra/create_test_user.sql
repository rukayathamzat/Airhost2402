DO $$ 
BEGIN
  -- Vérifier que l'utilisateur existe dans auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff') THEN
    -- Insérer l'utilisateur de test dans la table hosts s'il n'existe pas déjà
    INSERT INTO public.hosts (
      id,
      email,
      phone_number_id,
      whatsapp_access_token,
      verify_token
    ) VALUES (
      '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
      'expertiaen5min@gmail.com',
      '477925252079395',
      'EAAX0gXt8e64BO0LghewRfAiilcQHhK7YwDQqXagwDcfRj9Nz3gpFBlsxrrdK5H79hE7ZCHanHPXYf7bTo1BtEwIQ5zLOpeIGErHbuagUv5c3jZB4F4ZAhZBTiB4bnOQKmHGZB0Jxl5UEXdtGT4MDTNgIoJsUspoSouZAUhxWYiD2stjhWq8n41YK8ULJlpsfFX1LWzmtzVu79E7y7W4llLPEZAasgZDZD',
      'watsapp123'
    ) ON CONFLICT (id) DO NOTHING;

    -- Insérer une propriété de test si l'hôte a été inséré
    IF FOUND THEN
      INSERT INTO public.properties (
        host_id,
        name,
        address,
        description
      ) VALUES (
        '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
        'Appartement Test',
        '123 Rue de Test, Paris',
        'Un bel appartement pour tester l''application'
      );
    END IF;
  ELSE
    RAISE EXCEPTION 'L''utilisateur n''existe pas encore dans auth.users. Veuillez d''abord confirmer son compte.';
  END IF;
END $$;
