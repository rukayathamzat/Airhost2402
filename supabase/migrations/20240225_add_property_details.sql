-- Ajout des colonnes pour les détails de la propriété
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '{}'::jsonb;

-- Mise à jour des propriétés existantes avec des valeurs par défaut
UPDATE properties
SET 
  description = COALESCE(description, ''),
  amenities = COALESCE(amenities, '{}'::jsonb),
  rules = COALESCE(rules, '{}'::jsonb),
  faq = COALESCE(faq, '{}'::jsonb);
