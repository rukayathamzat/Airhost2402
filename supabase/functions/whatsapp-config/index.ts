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

serve(async (req) => {
  // Gestion des requêtes OPTIONS (pre-flight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Débogage des headers
    logHeaders(req.headers);
    
    // Récupération des variables d'environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Récupération du token JWT
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header:', authHeader);
    
    if (!authHeader) {
      console.error('Aucun header d\'autorisation trouvé');
      return new Response(
        JSON.stringify({ error: 'Aucun token d\'authentification fourni' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Création du client Supabase avec le token d'autorisation de la requête
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    console.log('Client Supabase créé avec succès');

    // Vérification de l'authentification
    const { data, error: authError } = await supabaseClient.auth.getUser();
    console.log('Résultat getUser:', data, authError);
    
    if (authError) {
      console.error('Erreur d\'authentification:', authError);
      return new Response(
        JSON.stringify({ error: 'Erreur d\'authentification: ' + authError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!data.user) {
      console.error('Utilisateur non trouvé');
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
