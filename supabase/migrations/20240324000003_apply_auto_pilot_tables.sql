-- First, ensure properties table has manager_id
DO $$ 
BEGIN
    -- Add manager_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'manager_id'
    ) THEN
        -- Instead of adding manager_id, we'll use host_id for RLS
        -- Enable RLS if not already enabled
        ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
        
        -- Add RLS policies using host_id
        CREATE POLICY "Property managers can view their properties"
            ON properties FOR SELECT
            USING (host_id = auth.uid());
            
        CREATE POLICY "Property managers can update their properties"
            ON properties FOR UPDATE
            USING (host_id = auth.uid());
            
        CREATE POLICY "Property managers can insert properties"
            ON properties FOR INSERT
            WITH CHECK (host_id = auth.uid());
    END IF;
END $$;

-- Then create auto_pilot tables if they don't exist
DO $$ 
BEGIN
    -- Create auto_pilot_configs if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'auto_pilot_configs'
    ) THEN
        CREATE TABLE auto_pilot_configs (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
            is_enabled BOOLEAN DEFAULT false,
            response_delay INTEGER DEFAULT 5000,
            max_daily_responses INTEGER DEFAULT 50,
            working_hours JSONB DEFAULT '{"start": "08:00", "end": "20:00"}'::jsonb,
            excluded_keywords TEXT[] DEFAULT ARRAY['emergency', 'urgent', 'help', 'danger'],
            priority_rules JSONB DEFAULT '{
                "high": {"keywords": ["urgent", "important", "asap"], "responseDelay": 1000},
                "medium": {"keywords": ["question", "help", "info"], "responseDelay": 5000},
                "low": {"keywords": ["general", "thanks", "ok"], "responseDelay": 10000}
            }'::jsonb,
            scheduled_responses JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create auto_pilot_responses if it doesn't exist
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

        -- Enable RLS
        ALTER TABLE auto_pilot_configs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE auto_pilot_responses ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Property managers can view their auto-pilot configs" ON auto_pilot_configs;
        DROP POLICY IF EXISTS "Property managers can update their auto-pilot configs" ON auto_pilot_configs;
        DROP POLICY IF EXISTS "Property managers can insert their auto-pilot configs" ON auto_pilot_configs;
        DROP POLICY IF EXISTS "Property managers can view their auto-pilot responses" ON auto_pilot_responses;
        DROP POLICY IF EXISTS "Property managers can insert their auto-pilot responses" ON auto_pilot_responses;

        -- Add RLS policies with proper checks using host_id
        CREATE POLICY "Property managers can view their auto-pilot configs"
            ON auto_pilot_configs FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = auto_pilot_configs.property_id
                    AND properties.host_id = auth.uid()
                )
            );

        CREATE POLICY "Property managers can update their auto-pilot configs"
            ON auto_pilot_configs FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = auto_pilot_configs.property_id
                    AND properties.host_id = auth.uid()
                )
            );

        CREATE POLICY "Property managers can insert their auto-pilot configs"
            ON auto_pilot_configs FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = property_id
                    AND properties.host_id = auth.uid()
                )
            );

        CREATE POLICY "Property managers can view their auto-pilot responses"
            ON auto_pilot_responses FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = auto_pilot_responses.property_id
                    AND properties.host_id = auth.uid()
                )
            );

        CREATE POLICY "Property managers can insert their auto-pilot responses"
            ON auto_pilot_responses FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = property_id
                    AND properties.host_id = auth.uid()
                )
            );
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'auto_pilot_configs' 
            AND column_name = 'priority_rules'
        ) THEN
            ALTER TABLE auto_pilot_configs
            ADD COLUMN priority_rules JSONB DEFAULT '{
                "high": {"keywords": ["urgent", "important", "asap"], "responseDelay": 1000},
                "medium": {"keywords": ["question", "help", "info"], "responseDelay": 5000},
                "low": {"keywords": ["general", "thanks", "ok"], "responseDelay": 10000}
            }'::jsonb;
        END IF;

        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'auto_pilot_configs' 
            AND column_name = 'scheduled_responses'
        ) THEN
            ALTER TABLE auto_pilot_configs
            ADD COLUMN scheduled_responses JSONB DEFAULT '[]'::jsonb;
        END IF;

        -- Update RLS policies if they exist
        DROP POLICY IF EXISTS "Property managers can view their auto-pilot configs" ON auto_pilot_configs;
        DROP POLICY IF EXISTS "Property managers can update their auto-pilot configs" ON auto_pilot_configs;
        DROP POLICY IF EXISTS "Property managers can insert their auto-pilot configs" ON auto_pilot_configs;
        DROP POLICY IF EXISTS "Property managers can view their auto-pilot responses" ON auto_pilot_responses;
        DROP POLICY IF EXISTS "Property managers can insert their auto-pilot responses" ON auto_pilot_responses;

        -- Recreate policies with proper checks using host_id
        CREATE POLICY "Property managers can view their auto-pilot configs"
            ON auto_pilot_configs FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = auto_pilot_configs.property_id
                    AND properties.host_id = auth.uid()
                )
            );

        CREATE POLICY "Property managers can update their auto-pilot configs"
            ON auto_pilot_configs FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = auto_pilot_configs.property_id
                    AND properties.host_id = auth.uid()
                )
            );

        CREATE POLICY "Property managers can insert their auto-pilot configs"
            ON auto_pilot_configs FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = property_id
                    AND properties.host_id = auth.uid()
                )
            );

        CREATE POLICY "Property managers can view their auto-pilot responses"
            ON auto_pilot_responses FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = auto_pilot_responses.property_id
                    AND properties.host_id = auth.uid()
                )
            );

        CREATE POLICY "Property managers can insert their auto-pilot responses"
            ON auto_pilot_responses FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM properties
                    WHERE properties.id = property_id
                    AND properties.host_id = auth.uid()
                )
            );
    END IF;
END $$; 