import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
}

// Créer le client Supabase avec service_role
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY non configurée')
  throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante')
}

console.log('Configuration Supabase:', {
  url: supabaseUrl,
  hasServiceRole: !!serviceRoleKey
})

const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Sauvegarder le message dans la base de données
async function saveMessage(message: any) {
  console.log('Début saveMessage avec:', JSON.stringify(message, null, 2))
  
  // Vérifier la connexion Supabase et la structure de la table
  try {
    // Récupérer la structure de la table
    const { data: tableInfo, error: tableError } = await supabaseClient
      .from('messages')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('Erreur lors de la récupération de la structure:', tableError)
      return false
    }

    // Afficher les colonnes disponibles
    if (tableInfo && tableInfo[0]) {
      console.log('Colonnes disponibles:', Object.keys(tableInfo[0]))
    }
    
    console.log('Connexion Supabase OK, accès à la table messages confirmé')
    
    // Vérifier la structure du message
    if (!message || !message.text || !message.text.body) {
      console.error('Structure de message invalide:', JSON.stringify(message, null, 2))
      return false
    }

    console.log('Structure du message valide:', JSON.stringify(message, null, 2))

    // Utiliser la propriété de test
    const property = {
      id: 'ca22cac3-1b00-4b7e-a000-e12742eb52e6'
    }

    console.log('Propriété de test:', property)

    // D'abord créer une conversation si elle n'existe pas
    const phoneNumber = message.from
    console.log('Recherche de conversation pour le numéro:', phoneNumber)
    
    let { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .select('*')
      .eq('guest_phone', phoneNumber)
      .single()

    console.log('Résultat recherche conversation:', { conversation, conversationError })

    if (conversationError) {
      console.log('Création d\'une nouvelle conversation pour:', phoneNumber)
      // Créer une nouvelle conversation
      const { data: newConversation, error: createError } = await supabaseClient
        .from('conversations')
        .insert([{
          property_id: property.id,
          guest_name: 'Guest ' + phoneNumber,
          guest_phone: phoneNumber,
          status: 'active'
        }])
        .select('id')
        .single()

      if (createError) {
        console.error('Erreur lors de la création de la conversation:', createError)
        return false
      }
      console.log('Nouvelle conversation créée:', newConversation)
      conversation = newConversation
    }

    const messageData = {
      content: message.text.body,
      direction: 'inbound',
      status: 'delivered',
      payload: message,
      conversation_id: conversation.id
    }

    console.log('Données à insérer:', JSON.stringify(messageData, null, 2))

    console.log('Structure finale du message:', JSON.stringify(messageData, null, 2))
    
    console.log('Tentative insertion avec données:', JSON.stringify(messageData, null, 2))
    
    const { data, error } = await supabaseClient
      .from('messages')
      .insert([messageData])

    if (error) {
      console.error('Erreur lors de la sauvegarde:', {
        error: JSON.stringify(error, null, 2),
        messageData,
        statusCode: error.code,
        details: error.details,
        message: error.message
      })
      return false
    }
    
    console.log('Message sauvegardé avec succès:', JSON.stringify(data, null, 2))

    return true
  } catch (error) {
    console.error('Exception lors de la sauvegarde:', error)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Gestion de la vérification du webhook (GET)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN')
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('Webhook vérifié!')
        return new Response(challenge, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          status: 200 
        })
      }
      
      return new Response('Vérification échouée', { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 403 
      })
    }

    // Gestion des messages entrants (POST)
    if (req.method === 'POST') {
      const body = await req.json()
      console.log('Message reçu:', JSON.stringify(body, null, 2))

      // Traiter les messages
      console.log('Structure complète du body:', JSON.stringify(body, null, 2))
      
      const entry = body.entry?.[0]
      console.log('Entry:', JSON.stringify(entry, null, 2))
      
      const changes = entry?.changes?.[0]
      console.log('Changes:', JSON.stringify(changes, null, 2))
      
      // Vérifier tous les types d'événements possibles
      const value = changes?.value
      
      if (value) {
        let messageToSave = null

        if (value.messages?.[0]) {
          // Message standard
          messageToSave = value.messages[0]
          console.log('Message standard trouvé:', messageToSave)
        } else if (value.message_template_quality_update) {
          // Mise à jour de template
          messageToSave = {
            type: 'template_update',
            text: { body: JSON.stringify(value.message_template_quality_update) },
            timestamp: Math.floor(Date.now() / 1000).toString()
          }
          console.log('Mise à jour template trouvée:', messageToSave)
        } else if (value.statuses?.[0]) {
          // Statut de message
          messageToSave = {
            type: 'status',
            text: { body: value.statuses[0].status },
            timestamp: value.statuses[0].timestamp
          }
          console.log('Statut trouvé:', messageToSave)
        }

        if (messageToSave) {
          console.log('Sauvegarde du message:', messageToSave)
          const result = await saveMessage(messageToSave)
          console.log('Résultat sauvegarde:', result)
        } else {
          console.log('Type de message non reconnu dans:', value)
        }
      } else {
        console.log('Aucune donnée trouvée dans les changements:', changes)
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    return new Response('Méthode non supportée', { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 405 
    })

  } catch (error) {
    console.error('Erreur:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
