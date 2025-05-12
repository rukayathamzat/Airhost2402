import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WhatsAppTemplate {
  name: string
  language: {
    code: string
  }
  components?: Array<{
    type: string
    parameters: Array<{
      type: string
      text?: string
    }>
  }>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Requête reçue:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Pas de header Authorization');
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }, 
          status: 401 
        }
      )
    }

    // Pour l'instant, on accepte toutes les requêtes authentifiées
    console.log('Requête authentifiée acceptée');

    // Récupérer la configuration WhatsApp
    const { data: config, error: configError } = await supabaseClient
      .from('whatsapp_config')
      .select('phone_number_id, token')
      .single()

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Configuration WhatsApp non trouvée' }),
        { status: 400 }
      )
    }

    // Récupérer les données du template
    const body = await req.json()
    console.log('Corps de la requête:', body)
    
    const { template_name, language, to } = body
    
    if (!template_name || !to || !language) {
      return new Response(
        JSON.stringify({ error: 'template_name, language et numéro de téléphone requis' }),
        { status: 400 }
      )
    }

    // Envoyer le template via l'API WhatsApp
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: template_name,
            language: {
              code: language
            }
          },
        }),
      }
    )

    const result = await response.json()
    console.log('Réponse WhatsApp:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
