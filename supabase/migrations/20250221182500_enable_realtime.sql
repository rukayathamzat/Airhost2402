-- Enable realtime for messages table
alter publication supabase_realtime add table messages;

-- Add RLS policies for messages
alter table messages enable row level security;

create policy "Enable read access for all users" on messages for select using (true);

create policy "Enable insert access for authenticated users" on messages for insert 
  with check (auth.role() = 'authenticated');

create policy "Enable update access for authenticated users" on messages for update 
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
