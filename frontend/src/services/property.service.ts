import { supabase } from '../lib/supabase';
import { Property } from '../types/property';

export async function fetchProperties(): Promise<Property[]> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) {
    throw new Error('Utilisateur non authentifié');
  }

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('host_id', user.data.user.id);

  if (error) {
    console.error('Erreur lors de la récupération des propriétés:', error);
    throw error;
  }

  return data || [];
}

export async function fetchPropertyById(id: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Erreur lors de la récupération de la propriété ${id}:`, error);
    throw error;
  }

  return data;
}

export async function updateProperty(property: Property): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update({
      name: property.name,
      address: property.address,
      description: property.description,
      ai_instructions: property.ai_instructions,
      amenities: property.amenities,
      rules: property.rules,
      faq: property.faq,
      updated_at: new Date().toISOString()
    })
    .eq('id', property.id)
    .eq('host_id', property.host_id) // Sécurité supplémentaire
    .select()
    .single();

  if (error) {
    console.error(`Erreur lors de la mise à jour de la propriété ${property.id}:`, error);
    throw error;
  }

  return data;
}

export async function createProperty(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) {
    throw new Error('Utilisateur non authentifié');
  }

  const newProperty = {
    ...property,
    host_id: user.data.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('properties')
    .insert([newProperty])
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la création de la propriété:', error);
    throw error;
  }

  return data;
}

export async function deleteProperty(id: string): Promise<void> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) {
    throw new Error('Utilisateur non authentifié');
  }

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .eq('host_id', user.data.user.id); // Sécurité supplémentaire

  if (error) {
    console.error(`Erreur lors de la suppression de la propriété ${id}:`, error);
    throw error;
  }
}
