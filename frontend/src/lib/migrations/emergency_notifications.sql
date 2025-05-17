-- Create emergency_notifications table
CREATE TABLE IF NOT EXISTS emergency_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    emergency_case_id UUID REFERENCES emergency_cases(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('immediate', 'urgent', 'standard')),
    detected_keywords TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    notification_status TEXT CHECK (notification_status IN ('pending', 'sent', 'failed')),
    notification_error TEXT
);

-- Create property_managers table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_managers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_property_id ON emergency_notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_case_id ON emergency_notifications(emergency_case_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_created_at ON emergency_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_property_managers_property_id ON property_managers(property_id);
CREATE INDEX IF NOT EXISTS idx_property_managers_user_id ON property_managers(user_id);

-- Add RLS policies
ALTER TABLE emergency_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_managers ENABLE ROW LEVEL SECURITY;

-- Policy for property managers to view their own emergency notifications
CREATE POLICY "Property managers can view their own emergency notifications"
    ON emergency_notifications
    FOR SELECT
    USING (
        property_id IN (
            SELECT property_id FROM property_managers
            WHERE user_id = auth.uid()
        )
    );

-- Policy for system to insert emergency notifications
CREATE POLICY "System can insert emergency notifications"
    ON emergency_notifications
    FOR INSERT
    WITH CHECK (true);

-- Policy for system to update notification status
CREATE POLICY "System can update notification status"
    ON emergency_notifications
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy for property managers to view their own property manager entries
CREATE POLICY "Property managers can view their own entries"
    ON property_managers
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy for admins to manage property managers
CREATE POLICY "Admins can manage property managers"
    ON property_managers
    USING (auth.uid() IN (
        SELECT user_id FROM user_roles
        WHERE role = 'admin'
    ));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for property_managers
CREATE TRIGGER update_property_managers_updated_at
    BEFORE UPDATE ON property_managers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 