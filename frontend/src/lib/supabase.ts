import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '../utils/url';

// Logs détaillés pour le débogage
console.log('========== DÉBOGAGE SUPABASE CONFIGURATION ==========');

// Vérifier toutes les variables d'environnement disponibles
console.log('Variables d\'environnement disponibles:');
console.log('VITE_SUPABASE_URL (brut):', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_URL (type):', typeof import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY (présent):', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Oui' : 'Non');
console.log('VITE_SITE_URL (brut):', import.meta.env.VITE_SITE_URL);
console.log('Environnement MODE:', import.meta.env.MODE);
console.log('Est en PROD:', import.meta.env.PROD ? 'Oui' : 'Non');

// Afficher toutes les variables d'environnement disponibles
console.log('Toutes les variables d\'environnement:');
console.log(import.meta.env);

// Récupérer l'URL Supabase avec plus de contrôle
const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const defaultSupabaseUrl = 'https://tornfqtvnzkgnwfudxdb.supabase.co';

// Vérifier si l'URL Supabase est un placeholder ou une URL incorrecte
if (envSupabaseUrl && (
  envSupabaseUrl.includes('your-project.supabase.co') ||
  envSupabaseUrl.includes('example.supabase.co') ||
  !envSupabaseUrl.includes('.supabase.co')
)) {
  console.error('ERREUR DE CONFIGURATION: L\'URL Supabase semble incorrecte:', envSupabaseUrl);
  console.error('Veuillez vérifier la variable d\'environnement VITE_SUPABASE_URL dans le dashboard Netlify');
  // Afficher une alerte pour les développeurs en mode développement
  if (import.meta.env.DEV) {
    alert('ERREUR DE CONFIGURATION SUPABASE: L\'URL Supabase est incorrecte. Vérifiez la console pour plus de détails.');
  }
}

// Utiliser les variables d'environnement pour l'URL et la clé Supabase
// Valeur par défaut pour la production
const supabaseUrl = envSupabaseUrl || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE';

// Logs pour comprendre la source de l'URL
console.log('Source de l\'URL Supabase:');
console.log('- URL depuis variable d\'environnement:', envSupabaseUrl);
console.log('- URL par défaut:', defaultSupabaseUrl);
console.log('- URL finale utilisée:', supabaseUrl);

// Vérifier que les valeurs sont correctes
console.log('Valeurs finales utilisées:');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Définie' : 'Non définie');
console.log('Environnement:', import.meta.env.MODE);
console.log('URL du site:', getSiteUrl());
console.log('========== FIN DÉBOGAGE SUPABASE ==========');

// Créer le client Supabase avec l'URL et la clé
console.log('Création du client Supabase avec URL:', supabaseUrl);
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
