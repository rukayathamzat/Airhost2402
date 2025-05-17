-- Create unknown_query_logs table
CREATE TABLE IF NOT EXISTS public.unknown_query_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id),
    message TEXT NOT NULL,
    is_unknown BOOLEAN NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    reason TEXT NOT NULL,
    suggested_response TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_unknown_query_logs_property_id ON public.unknown_query_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_unknown_query_logs_detected_at ON public.unknown_query_logs(detected_at);
CREATE INDEX IF NOT EXISTS idx_unknown_query_logs_is_unknown ON public.unknown_query_logs(is_unknown);

-- Enable Row Level Security
ALTER TABLE public.unknown_query_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Property managers can view their unknown query logs"
    ON public.unknown_query_logs
    FOR SELECT
    USING (
        property_id IN (
            SELECT property_id 
            FROM public.property_managers 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert unknown query logs"
    ON public.unknown_query_logs
    FOR INSERT
    WITH CHECK (true); 