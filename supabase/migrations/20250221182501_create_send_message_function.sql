-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    content TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the function to send WhatsApp messages
CREATE OR REPLACE FUNCTION send_whatsapp_message(
    p_conversation_id UUID,
    p_content TEXT
) RETURNS messages AS $$
DECLARE
    v_message messages;
BEGIN
    -- Insert the message first
    INSERT INTO messages (conversation_id, content, direction)
    VALUES (p_conversation_id, p_content, 'outbound')
    RETURNING * INTO v_message;

    -- The actual sending to WhatsApp will be handled by the Edge function
    -- We just return the created message
    RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
