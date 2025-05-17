-- Create emergency_detection_logs table
CREATE TABLE IF NOT EXISTS emergency_detection_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    emergency_case_id UUID NOT NULL REFERENCES emergency_cases(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    matched_keywords TEXT[] NOT NULL DEFAULT '{}',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    notification_status TEXT CHECK (notification_status IN ('pending', 'sent', 'failed')),
    notification_error TEXT
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_emergency_detection_logs_property_id ON emergency_detection_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_emergency_detection_logs_case_id ON emergency_detection_logs(emergency_case_id);
CREATE INDEX IF NOT EXISTS idx_emergency_detection_logs_detected_at ON emergency_detection_logs(detected_at);

-- Add RLS policies
ALTER TABLE emergency_detection_logs ENABLE ROW LEVEL SECURITY;

-- Policy for property managers to view their own emergency detection logs
CREATE POLICY "Property managers can view their own emergency detection logs"
    ON emergency_detection_logs
    FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM properties
            WHERE manager_id = auth.uid()
        )
    );

-- Policy for system to insert emergency detection logs
CREATE POLICY "System can insert emergency detection logs"
    ON emergency_detection_logs
    FOR INSERT
    WITH CHECK (true);

-- Policy for system to update notification status
CREATE POLICY "System can update notification status"
    ON emergency_detection_logs
    FOR UPDATE
    USING (true)
    WITH CHECK (true); 