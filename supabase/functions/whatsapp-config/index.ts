import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion des requêtes OPTIONS (pre-flight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupération des variables d'environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Création du client Supabase avec le token d'autorisation de la requête
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    })

    // Vérification de l'authentification
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Traitement selon la méthode HTTP
    if (req.method === 'GET') {
      // Récupération de la configuration WhatsApp via la fonction RPC
      const { data, error } = await supabaseClient.rpc('get_whatsapp_config')
      
      if (error) throw error

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
      const { error } = await supabaseClient
        .from('whatsapp_config')
        .upsert(dataToSave)
      
      if (error) throw error
      
      return new Response(
        JSON.stringify({ success: true }),
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
