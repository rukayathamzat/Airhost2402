import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '../utils/url';

// Définir explicitement l'URL Supabase et la clé pour éviter les erreurs
const supabaseUrl = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE';

// Vérifier que les valeurs sont correctes
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Définie' : 'Non définie');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Définir l'URL de redirection via les options de Supabase
    // Note: la propriété 'site' n'est pas disponible dans le type, mais fonctionne en runtime
    // @ts-ignore - La propriété 'site' existe dans l'API mais pas dans les types
    site: getSiteUrl()
  }
});
