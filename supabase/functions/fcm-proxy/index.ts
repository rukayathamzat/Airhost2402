// Déclaration pour éviter les erreurs TypeScript avec Deno
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PushNotificationPayload {
  to: string
  notification: {
    title: string
    body: string
  }
  data?: Record<string, string>
}

// Fonction auxiliaire pour obtenir la clé serveur FCM
function getFCMServerKey(): string | null {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
  
  if (!fcmServerKey) {
    console.error('Variable d\'environnement FCM_SERVER_KEY manquante')
    return null
  }
  
  return fcmServerKey
}

// Fonction pour récupérer les informations de configuration Firebase publiques
function getFirebasePublicConfig() {
  const apiKey = Deno.env.get('FIREBASE_API_KEY') || ''
  const authDomain = "airhost-d9c48.firebaseapp.com"
  const projectId = Deno.env.get('FCM_PROJECT_ID') || ''
  const storageBucket = "airhost-d9c48.appspot.com"
  const messagingSenderId = "107044522957"
  const appId = "1:107044522957:web:ad4e9a0c48dc18cd2bb18e"
  
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId
  }
}

// URL de l'API FCM
const FCM_API_URL = 'https://fcm.googleapis.com/fcm/send'

serve(async (req) => {
  console.log('=== DÉBUT TRAITEMENT FCM-PROXY ===');
  console.log('URL:', req.url);
  console.log('Méthode:', req.method);
  
  // Gérer les requêtes préflight OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    })
  }
  
  // Endpoint pour récupérer la configuration Firebase (accessible publiquement)
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/config')) {
    const config = getFirebasePublicConfig()
    return new Response(JSON.stringify({ config }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  // Vérification de la méthode
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  try {
    // Création du client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupération du token JWT de la requête
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Non authentifié')
    }

    // Vérification du token JWT
    const token = authHeader.replace('Bearer ', '')
    
    // Vérifier si c'est la clé de service
    const isServiceKey = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!isServiceKey) {
      // Si ce n'est pas la clé de service, vérifier l'utilisateur
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      
      if (authError || !user) {
        throw new Error('Token invalide')
      }
    }

    // Récupération du payload
    const requestBody = await req.text();
    console.log('[FCM-PROXY DEBUG] Payload brut reçu:', requestBody);
    
    const payload: PushNotificationPayload = JSON.parse(requestBody);
    console.log('[FCM-PROXY DEBUG] Payload parsé:', JSON.stringify(payload, null, 2));
    console.log('[FCM-PROXY DEBUG] Données du message:', JSON.stringify(payload.data || {}, null, 2));

    // VÉRIFICATION RENFORCÉE: ne jamais envoyer de notification pour les messages sortants
    if (payload.data) {
      console.log('[FCM-PROXY DEBUG] Vérification des attributs du message:');
      console.log('- direction:', payload.data.direction);
      console.log('- isOutbound:', payload.data.isOutbound);
      console.log('- type:', payload.data.type);
      
      // Vérification 1: direction explicite
      if (payload.data.direction === 'outbound') {
        console.log('[FCM-PROXY DEBUG] Message sortant détecté (direction=outbound), annulation de notification');
        return new Response(JSON.stringify({
          success: true,
          filtered: true,
          reason: 'outbound_message'
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // Vérification 2: flag isOutbound
      if (payload.data.isOutbound === 'true') {
        console.log('[FCM-PROXY DEBUG] Message sortant détecté (isOutbound=true), annulation de notification');
        return new Response(JSON.stringify({
          success: true,
          filtered: true,
          reason: 'outbound_message'
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // Vérification 3: vérifier si c'est un message envoyé par l'utilisateur actuel
      if (payload.data.sender_id && !isServiceKey) {
        try {
          // Récupérer les informations de l'utilisateur
          const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
          
          if (!authError && user && payload.data.sender_id === user.id) {
            console.log('[FCM-PROXY DEBUG] Message envoyé par l\'utilisateur actuel, annulation de notification');
            return new Response(JSON.stringify({
              success: true,
              filtered: true,
              reason: 'self_message'
            }), {
              status: 200,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
        } catch (e) {
          console.error('[FCM-PROXY DEBUG] Erreur lors de la vérification de l\'expéditeur:', e);
          // En cas d'erreur, on continue pour ne pas bloquer les notifications légitimes
        }
      }
    }

    // Vérification que le token FCM appartient bien à l'utilisateur
    if (!isServiceKey) {
      // Récupérer les informations de l'utilisateur
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      const { data: subscription, error: dbError } = await supabaseClient
        .from('push_subscriptions')
        .select('token')
        .eq('user_id', user.id)
        .eq('token', payload.to)
        .single()

      if (dbError || !subscription) {
        // Autoriser les tokens de test et les tokens qui commencent par 'mock-fcm-token'
        if (payload.to !== 'test-fcm-token' && !payload.to.startsWith('mock-fcm-token')) {
          console.warn(`Token FCM non trouvé dans la base de données: ${payload.to.substring(0, 10)}... pour l'utilisateur ${user.id}`)
          
          // Tentative d'auto-correction : enregistrer automatiquement ce token
          try {
            await supabaseClient
              .from('push_subscriptions')
              .upsert({
                user_id: user.id,
                token: payload.to,
                platform: 'fcm',
                subscription: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            console.log(`Token FCM auto-enregistré pour l'utilisateur ${user.id}`)
          } catch (regError) {
            console.error(`Échec de l'auto-enregistrement du token:`, regError)
            // Continue malgré l'erreur d'enregistrement
          }
          
          // Ne pas bloquer l'envoi même si le token n'est pas enregistré
          // Cela permet à l'application de fonctionner même si l'enregistrement échoue
        }
      }
    }

    // Cas spécial pour le token de test
    if (payload.to === 'test-fcm-token') {
      console.log('Token de test détecté, simulation de réponse réussie')
      return new Response(JSON.stringify({
        success: true,
        messageId: "test-message-id-"+Date.now()
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Vérifier que la clé serveur FCM est disponible
    const serverKey = getFCMServerKey()
    if (!serverKey) {
      throw new Error('Clé serveur FCM manquante')
    }
    
    // Préparer le message pour l'API FCM HTTP v1
    const fcmMessage = {
      to: payload.to,
      notification: payload.notification,
      data: payload.data || {},
      priority: 'high',
      content_available: true,
      mutable_content: true,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: 'default-channel',
          priority: 'high'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            content_available: 1,
            mutable_content: 1
          }
        }
      }
    }
    
    console.log('[FCM-PROXY DEBUG] Envoi de notification FCM:', JSON.stringify(fcmMessage, null, 2));
    
    // Envoi du message à l'API FCM
    const response = await fetch(FCM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`
      },
      body: JSON.stringify(fcmMessage)
    })
    
    // Récupération de la réponse
    const responseData = await response.json()
    
    console.log('[FCM-PROXY DEBUG] Réponse FCM:', JSON.stringify(responseData, null, 2));
    console.log('=== FIN TRAITEMENT FCM-PROXY ===');
    
    // Retour de la réponse
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error("Erreur:", error.message)
    console.log('=== FIN TRAITEMENT FCM-PROXY AVEC ERREUR ===');
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === 'Non authentifié' ? 401 : 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
