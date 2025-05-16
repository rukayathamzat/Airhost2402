-- Add manager_id column to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_manager_id ON properties(manager_id);

-- Update RLS policies to use manager_id
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Policy for property managers to view their properties
CREATE POLICY "Property managers can view their properties"
    ON properties FOR SELECT
    USING (manager_id = auth.uid());

-- Policy for property managers to update their properties
CREATE POLICY "Property managers can update their properties"
    ON properties FOR UPDATE
    USING (manager_id = auth.uid());

-- Policy for property managers to insert properties
CREATE POLICY "Property managers can insert properties"
    ON properties FOR INSERT
    WITH CHECK (manager_id = auth.uid()); 