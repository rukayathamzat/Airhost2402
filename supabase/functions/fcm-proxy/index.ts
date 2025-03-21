// Déclaration pour éviter les erreurs TypeScript avec Deno
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// URL FCM pour l'envoi direct des notifications
const FCM_URL = 'https://fcm.googleapis.com/fcm/send'
// Utilisation de la variable d'environnement de manière compatible avec Supabase Edge Functions
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || Deno.env.get('FCM_SERVER_KEY')

interface PushNotificationPayload {
  to: string
  notification: {
    title: string
    body: string
  }
  data?: Record<string, string>
}

serve(async (req) => {
  // Vérification de la méthode
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Token invalide')
    }

    // Vérification de la clé serveur FCM
    if (!FCM_SERVER_KEY) {
      throw new Error('FCM_SERVER_KEY non configurée')
    }

    // Récupération du payload
    const payload: PushNotificationPayload = await req.json()

    // Vérification que le token FCM appartient bien à l'utilisateur
    const { data: subscription, error: dbError } = await supabaseClient
      .from('push_subscriptions')
      .select('token')
      .eq('user_id', user.id)
      .eq('token', payload.to)
      .single()

    if (dbError || !subscription) {
      throw new Error('Token FCM non autorisé pour cet utilisateur')
    }

    // Envoi de la notification à FCM
    const fcmResponse = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!fcmResponse.ok) {
      const fcmError = await fcmResponse.text()
      console.error('Erreur FCM:', fcmError)
      throw new Error('Erreur lors de l\'envoi de la notification FCM')
    }

    const fcmResult = await fcmResponse.json()

    return new Response(JSON.stringify(fcmResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Erreur:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === 'Non authentifié' ? 401 : 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
