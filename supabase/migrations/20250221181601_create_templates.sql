-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    language VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert initial templates
INSERT INTO templates (name, content, variables, language)
VALUES 
  ('bienvenue', 'Bonjour! Bienvenue dans notre propriété.', '{}', 'fr'),
  ('hello_world', 'Hello! Welcome to our property.', '{}', 'en_US');
