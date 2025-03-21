-- Vérifier les propriétés
SELECT 
    p.id,
    p.host_id,
    p.name,
    p.description,
    p.address,
    u.email as host_email
FROM public.properties p
JOIN auth.users u ON p.host_id = u.id;

-- Vérifier les conversations
SELECT 
    c.id,
    c.host_id,
    c.guest_number,
    c.last_message,
    c.last_message_at,
    c.unread_count,
    p.name as property_name,
    u.email as host_email
FROM public.conversations c
JOIN public.properties p ON c.property_id = p.id
JOIN auth.users u ON c.host_id = u.id;

-- Vérifier les messages
SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.direction,
    m.status,
    m.created_at,
    c.guest_number,
    u.email as host_email
FROM public.messages m
JOIN public.conversations c ON m.conversation_id = c.id
JOIN auth.users u ON c.host_id = u.id;
