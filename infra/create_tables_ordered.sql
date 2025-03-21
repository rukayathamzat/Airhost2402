-- Supprimer les tables existantes dans le bon ordre
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;

-- 1. Créer la table templates en premier
CREATE TABLE public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    namespace TEXT NOT NULL,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(namespace, name, language)
);

-- 2. Créer la table conversations
CREATE TABLE public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id UUID NOT NULL REFERENCES auth.users(id),
    guest_number TEXT NOT NULL,
    property_id UUID NOT NULL REFERENCES public.properties(id),
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Créer la table messages
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id),
    content TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    template_id UUID REFERENCES public.templates(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ajouter les politiques RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Politiques pour templates
CREATE POLICY "Les hôtes peuvent lire les templates"
    ON public.templates FOR SELECT
    TO authenticated
    USING (true);

-- Politiques pour conversations
CREATE POLICY "Les hôtes peuvent voir leurs conversations"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (host_id = auth.uid());

CREATE POLICY "Les hôtes peuvent créer des conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (host_id = auth.uid());

-- Politiques pour messages
CREATE POLICY "Les hôtes peuvent voir les messages de leurs conversations"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Les hôtes peuvent créer des messages dans leurs conversations"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE host_id = auth.uid()
        )
    );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer les triggers pour updated_at
CREATE TRIGGER handle_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Insérer les templates
INSERT INTO public.templates (
    namespace,
    name,
    language,
    content
) VALUES 
    ('customer_support', 'welcome', 'fr', 'Bonjour ! Je suis {{1}}, votre hôte pour {{2}}. Comment puis-je vous aider ?'),
    ('customer_support', 'booking_confirmed', 'fr', 'Votre réservation pour {{1}} est confirmée. Voici les détails : {{2}}'),
    ('customer_support', 'conversation_expired', 'fr', 'La conversation a expiré. Pour continuer, veuillez envoyer un nouveau message.');

-- Créer les conversations de test
WITH new_conversation AS (
    INSERT INTO public.conversations (
        host_id,
        guest_number,
        property_id,
        last_message,
        last_message_at,
        unread_count
    ) VALUES (
        '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
        '33612345678',
        (SELECT id FROM public.properties WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' LIMIT 1),
        'Bonjour, je suis intéressé par votre appartement',
        NOW() - INTERVAL '1 hour',
        1
    ) RETURNING id
)
INSERT INTO public.messages (
    conversation_id,
    content,
    direction,
    status
) VALUES (
    (SELECT id FROM new_conversation),
    'Bonjour, je suis intéressé par votre appartement',
    'inbound',
    'delivered'
);

-- Créer la deuxième conversation (ancienne)
WITH new_conversation AS (
    INSERT INTO public.conversations (
        host_id,
        guest_number,
        property_id,
        last_message,
        last_message_at,
        unread_count
    ) VALUES (
        '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
        '33698765432',
        (SELECT id FROM public.properties WHERE host_id = '7d3ca44d-f2d2-4109-8885-8ef004ee63ff' LIMIT 1),
        'Merci pour votre réponse',
        NOW() - INTERVAL '2 days',
        0
    ) RETURNING id
)
INSERT INTO public.messages (
    conversation_id,
    content,
    direction,
    status
) 
SELECT 
    id,
    message,
    direction,
    'delivered'
FROM new_conversation,
(VALUES 
    ('Bonjour, est-ce que l''appartement est disponible pour juillet ?', 'inbound'),
    ('Oui, l''appartement est disponible en juillet. Quelles sont vos dates exactes ?', 'outbound'),
    ('Merci pour votre réponse', 'inbound')
) AS messages(message, direction);
