import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNzk5MzI3OCwiZXhwIjoyMDIzNTY5Mjc4fQ.ywBfNvNqRYxQB4UKzYDVphzMO_gSf0HHpxXwBOZDHJE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProperty() {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*');

    if (error) {
      throw error;
    }

    console.log('Propriétés trouvées:', data);
  } catch (error) {
    console.error('Erreur:', error);
  }
}

checkProperty();
