-- Create property_managers table
CREATE TABLE IF NOT EXISTS public.property_managers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_property_managers_property_id ON public.property_managers(property_id);
CREATE INDEX IF NOT EXISTS idx_property_managers_user_id ON public.property_managers(user_id);

-- Enable Row Level Security
ALTER TABLE public.property_managers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own property manager entries"
    ON public.property_managers
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own property manager entries"
    ON public.property_managers
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own property manager entries"
    ON public.property_managers
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own property manager entries"
    ON public.property_managers
    FOR DELETE
    USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_property_managers_updated_at
    BEFORE UPDATE ON public.property_managers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 