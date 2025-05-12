import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createProperty() {
  try {
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        host_id: '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
        name: 'Appartement Paris Centre',
        description: 'Bel appartement au cœur de Paris',
        address: '123 Rue de Rivoli, 75001 Paris'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('Propriété créée avec succès:', property);
    return property;
  } catch (error) {
    console.error('Erreur:', error);
  }
}

createProperty();
