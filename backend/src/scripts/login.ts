import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function login() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'expertiaen5min@gmail.com',
      password: 'Airhost1702!'
    });

    if (error) {
      throw error;
    }

    console.log('Connecté avec succès:', data);
    return data;
  } catch (error) {
    console.error('Erreur:', error);
  }
}

login();
