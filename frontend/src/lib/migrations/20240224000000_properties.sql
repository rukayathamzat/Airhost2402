-- Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Property managers can view properties they manage"
    ON public.properties
    FOR SELECT
    USING (
        id IN (
            SELECT property_id 
            FROM public.property_managers 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Property managers can insert properties"
    ON public.properties
    FOR INSERT
    WITH CHECK (true);  -- Initially allow any authenticated user to create properties

CREATE POLICY "Property managers can update properties they manage"
    ON public.properties
    FOR UPDATE
    USING (
        id IN (
            SELECT property_id 
            FROM public.property_managers 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Property managers can delete properties they manage"
    ON public.properties
    FOR DELETE
    USING (
        id IN (
            SELECT property_id 
            FROM public.property_managers 
            WHERE user_id = auth.uid()
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 