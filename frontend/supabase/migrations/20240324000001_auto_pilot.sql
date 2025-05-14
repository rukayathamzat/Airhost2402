-- Create auto_pilot_configs table
CREATE TABLE auto_pilot_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    response_delay INTEGER DEFAULT 5000,
    max_daily_responses INTEGER DEFAULT 50,
    working_hours JSONB DEFAULT '{"start": "08:00", "end": "20:00"}'::jsonb,
    excluded_keywords TEXT[] DEFAULT ARRAY['emergency', 'urgent', 'help', 'danger'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auto_pilot_responses table
CREATE TABLE auto_pilot_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    original_message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_auto_pilot_configs_property_id ON auto_pilot_configs(property_id);
CREATE INDEX idx_auto_pilot_responses_property_id ON auto_pilot_responses(property_id);
CREATE INDEX idx_auto_pilot_responses_conversation_id ON auto_pilot_responses(conversation_id);
CREATE INDEX idx_auto_pilot_responses_created_at ON auto_pilot_responses(created_at);

-- Add RLS policies
ALTER TABLE auto_pilot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_pilot_responses ENABLE ROW LEVEL SECURITY;

-- Policies for auto_pilot_configs
CREATE POLICY "Property managers can view their auto-pilot configs"
    ON auto_pilot_configs FOR SELECT
    USING (property_id IN (
        SELECT id FROM properties WHERE manager_id = auth.uid()
    ));

CREATE POLICY "Property managers can update their auto-pilot configs"
    ON auto_pilot_configs FOR UPDATE
    USING (property_id IN (
        SELECT id FROM properties WHERE manager_id = auth.uid()
    ));

-- Policies for auto_pilot_responses
CREATE POLICY "Property managers can view their auto-pilot responses"
    ON auto_pilot_responses FOR SELECT
    USING (property_id IN (
        SELECT id FROM properties WHERE manager_id = auth.uid()
    )); 