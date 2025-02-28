import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '../utils/url';

// Utiliser les valeurs par défaut si les variables d'environnement ne sont pas définies
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE';

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
