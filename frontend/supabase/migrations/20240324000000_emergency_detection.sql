-- Create emergency_logs table
CREATE TABLE IF NOT EXISTS emergency_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('immediate', 'urgent', 'standard')),
    detected_keywords TEXT[] NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    property_id UUID REFERENCES properties(id),
    conversation_id UUID REFERENCES conversations(id)
);

-- Create emergency_notifications table
CREATE TABLE IF NOT EXISTS emergency_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) NOT NULL,
    manager_email TEXT NOT NULL,
    manager_phone TEXT,
    emergency_details JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emergency_logs_property_id ON emergency_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_conversation_id ON emergency_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_timestamp ON emergency_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_property_id ON emergency_notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_status ON emergency_notifications(status);

-- Add RLS policies
ALTER TABLE emergency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for emergency_logs
CREATE POLICY "Property managers can view their emergency logs"
    ON emergency_logs
    FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM properties
            WHERE manager_id = auth.uid()
        )
    );

-- Policy for emergency_notifications
CREATE POLICY "Property managers can view their emergency notifications"
    ON emergency_notifications
    FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM properties
            WHERE manager_id = auth.uid()
        )
    ); 