-- Create emergency_cases table
CREATE TABLE IF NOT EXISTS public.emergency_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id),
    name TEXT NOT NULL,
    description TEXT,
    keywords TEXT[] NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('immediate', 'urgent', 'standard')),
    response_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emergency_cases_property_id ON public.emergency_cases(property_id);
CREATE INDEX IF NOT EXISTS idx_emergency_cases_is_active ON public.emergency_cases(is_active);

-- Enable Row Level Security
ALTER TABLE public.emergency_cases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Property managers can view their own emergency cases"
    ON public.emergency_cases
    FOR SELECT
    USING (
        property_id IN (
            SELECT property_id 
            FROM public.property_managers 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Property managers can insert emergency cases"
    ON public.emergency_cases
    FOR INSERT
    WITH CHECK (
        property_id IN (
            SELECT property_id 
            FROM public.property_managers 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Property managers can update their emergency cases"
    ON public.emergency_cases
    FOR UPDATE
    USING (
        property_id IN (
            SELECT property_id 
            FROM public.property_managers 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Property managers can delete their emergency cases"
    ON public.emergency_cases
    FOR DELETE
    USING (
        property_id IN (
            SELECT property_id 
            FROM public.property_managers 
            WHERE user_id = auth.uid()
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_emergency_cases_updated_at
    BEFORE UPDATE ON public.emergency_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 