-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create hosts table
CREATE TABLE public.hosts (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  phone_number_id TEXT,
  whatsapp_access_token TEXT,
  verify_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID REFERENCES public.hosts(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  guest_number TEXT NOT NULL,
  unread_count INTEGER DEFAULT 0,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'template')) NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create templates table
CREATE TABLE public.templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID REFERENCES public.hosts(id) NOT NULL,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create faqs table
CREATE TABLE public.faqs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies

-- Hosts can only access their own data
CREATE POLICY "Hosts can only access their own data"
ON public.hosts
FOR ALL USING (auth.uid() = id);

-- Properties belong to hosts
CREATE POLICY "Properties belong to hosts"
ON public.properties
FOR ALL USING (host_id = auth.uid());

-- Conversations belong to property owners
CREATE POLICY "Conversations belong to property owners"
ON public.conversations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_id
    AND properties.host_id = auth.uid()
  )
);

-- Messages belong to conversation owners
CREATE POLICY "Messages belong to conversation owners"
ON public.messages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN properties p ON c.property_id = p.id
    WHERE messages.conversation_id = c.id
    AND p.host_id = auth.uid()
  )
);

-- Templates belong to hosts
CREATE POLICY "Templates belong to hosts"
ON public.templates
FOR ALL USING (host_id = auth.uid());

-- FAQs belong to property owners
CREATE POLICY "FAQs belong to property owners"
ON public.faqs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_id
    AND properties.host_id = auth.uid()
  )
);
