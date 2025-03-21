export interface Amenity {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface Property {
  id: string;
  host_id: string;
  name: string;
  address: string;
  description: string;
  ai_instructions: string;
  amenities: Amenity[];
  rules: Rule[];
  faq: FAQ[];
  created_at?: string;
  updated_at?: string;
}
