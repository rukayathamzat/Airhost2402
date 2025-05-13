-- Enable realtime for conversations table
alter publication supabase_realtime add table conversations;

-- Ensure RLS policies are properly configured for conversations
alter table conversations enable row level security;

-- Add policies for conversations if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'conversations' 
        AND policyname = 'Enable read access for authenticated users'
    ) THEN
        create policy "Enable read access for authenticated users" on conversations for select 
        using (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'conversations' 
        AND policyname = 'Enable insert access for authenticated users'
    ) THEN
        create policy "Enable insert access for authenticated users" on conversations for insert 
        with check (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'conversations' 
        AND policyname = 'Enable update access for authenticated users'
    ) THEN
        create policy "Enable update access for authenticated users" on conversations for update 
        using (auth.role() = 'authenticated')
        with check (auth.role() = 'authenticated');
    END IF;
END
$$;
