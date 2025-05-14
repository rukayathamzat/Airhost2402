-- Add priority and scheduling columns to auto_pilot_configs
ALTER TABLE auto_pilot_configs
ADD COLUMN IF NOT EXISTS priority_rules JSONB DEFAULT '{
  "high": {
    "keywords": ["urgent", "important", "asap"],
    "response_delay": 1000
  },
  "medium": {
    "keywords": ["question", "help", "info"],
    "response_delay": 5000
  },
  "low": {
    "keywords": ["general", "thanks", "ok"],
    "response_delay": 10000
  }
}'::jsonb,
ADD COLUMN IF NOT EXISTS scheduled_responses JSONB DEFAULT '[]'::jsonb;

-- Create auto_pilot_analytics table
CREATE TABLE IF NOT EXISTS auto_pilot_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    priority_level TEXT NOT NULL,
    response_time INTEGER NOT NULL,
    success_rate FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auto_pilot_analytics_property_id ON auto_pilot_analytics(property_id);
CREATE INDEX IF NOT EXISTS idx_auto_pilot_analytics_conversation_id ON auto_pilot_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_auto_pilot_analytics_created_at ON auto_pilot_analytics(created_at);

-- Add RLS policies
ALTER TABLE auto_pilot_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property managers can view their auto-pilot analytics"
    ON auto_pilot_analytics FOR SELECT
    USING (property_id IN (
        SELECT id FROM properties WHERE manager_id = auth.uid()
    ));

CREATE POLICY "Property managers can insert their auto-pilot analytics"
    ON auto_pilot_analytics FOR INSERT
    WITH CHECK (property_id IN (
        SELECT id FROM properties WHERE manager_id = auth.uid()
    )); 