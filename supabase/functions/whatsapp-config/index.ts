import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pour le débogage
const logHeaders = (headers: Headers) => {
  console.log('Headers reçus:');
  for (const [key, value] of headers.entries()) {
    console.log(`${key}: ${value}`);
  }
}

// Fonction pour extraire le JWT du header Authorization
const extractJWT = (authHeader: string | null): string | null => {
  if (!authHeader) return null;
  
  // Format attendu: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('Format de token invalide:', authHeader);
    return null;
  }
  
  return parts[1];
}

serve(async (req) => {
  // Gestion des requêtes OPTIONS (pre-flight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Débogage des headers
    console.log('Débogage des headers de la requête:');
    logHeaders(req.headers);
    
    // Récupération des variables d'environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    console.log('Variables d\'environnement:', { supabaseUrl: supabaseUrl ? 'Défini' : 'Non défini', supabaseKey: supabaseKey ? 'Défini' : 'Non défini' });
    
    // Récupération du token JWT
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header:', authHeader);
    
    // Extraction du JWT
    const jwt = extractJWT(authHeader);
    if (!jwt) {
      console.error('Token JWT invalide ou manquant');
      return new Response(
        JSON.stringify({ error: 'Token JWT invalide ou manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('JWT extrait avec succès');
    
    // Création du client Supabase avec le JWT
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    
    // Définir la session avec le JWT
    const { data: { session }, error: sessionError } = await supabaseClient.auth.setSession({
      access_token: jwt,
      refresh_token: ''
    });
    
    if (sessionError) {
      console.error('Erreur lors de la définition de la session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erreur d\'authentification: ' + sessionError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Session définie avec succès:', session ? 'Session valide' : 'Session non définie');
    
    // Vérification de l'utilisateur
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', userError);
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Utilisateur authentifié avec succès:', userData.user.id);
    
    // L'utilisateur est authentifié, on continue

    // Traitement selon la méthode HTTP
    if (req.method === 'GET') {
      // Récupération de la configuration WhatsApp via la fonction RPC
      console.log('Appel de la fonction RPC get_whatsapp_config');
      const { data, error } = await supabaseClient.rpc('get_whatsapp_config');
      
      if (error) {
        console.error('Erreur lors de l\'appel à la fonction RPC:', error);
        throw error;
      }
      
      console.log('Données récupérées avec succès:', data);

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    else if (req.method === 'POST') {
      // Récupération des données du corps de la requête
      const requestData = await req.json()
      
      // Validation des données
      if (!requestData.phone_number_id || !requestData.token) {
        return new Response(
          JSON.stringify({ error: 'Les champs phone_number_id et token sont requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Préparation des données avec updated_at
      const dataToSave = {
        phone_number_id: requestData.phone_number_id,
        token: requestData.token,
        updated_at: new Date().toISOString()
      }
      
      // Sauvegarde dans la table whatsapp_config
      console.log('Sauvegarde des données dans la table whatsapp_config:', dataToSave);
      const { error } = await supabaseClient
        .from('whatsapp_config')
        .upsert(dataToSave);
      
      if (error) {
        console.error('Erreur lors de la sauvegarde dans la table whatsapp_config:', error);
        throw error;
      }
      
      console.log('Données sauvegardées avec succès');
      
      return new Response(
        JSON.stringify({ success: true, message: 'Configuration WhatsApp sauvegardée avec succès' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    else {
      return new Response(
        JSON.stringify({ error: 'Méthode non supportée' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Erreur dans l\'Edge Function whatsapp-config:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
