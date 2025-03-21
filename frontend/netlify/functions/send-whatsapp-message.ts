import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Fonction pour normaliser un numéro de téléphone
function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // S'assurer que le numéro commence par +
  let normalized = phoneNumber;
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  // Supprimer tout ce qui n'est pas un chiffre ou +
  normalized = normalized.replace(/[^+0-9]/g, '');
  
  return normalized;
}

// Utiliser les variables d'environnement avec fallbacks
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials not properly configured');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const handler: Handler = async (event) => {
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Journaliser l'appel à la fonction
    console.log('send-whatsapp-message function invoked', { 
      method: event.httpMethod,
      path: event.path,
      hasAuth: !!event.headers.authorization
    });
    
    // Vérifier que Supabase est configuré
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials missing');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Supabase configuration incomplete' }),
      };
    }
    
    // Vérifier l'authentification
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('Authentication failed: Missing or invalid Bearer token');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - Bearer token required' }),
      };
    }

    // Récupérer les données du corps de la requête
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('Error parsing request body:', error);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
    
    const { content, to, conversation_id, metadata } = requestBody;
    
    // Valider les champs obligatoires
    if (!content || !to) {
      console.warn('Missing required fields:', { hasContent: !!content, hasRecipient: !!to });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields', 
          details: 'Both "content" and "to" fields are required' 
        }),
      };
    }
    
    // Normaliser le numéro de téléphone
    const normalizedTo = normalizePhoneNumber(to);
    console.log('Processing message to:', { original: to, normalized: normalizedTo });

    // Récupérer la configuration WhatsApp
    console.log('Retrieving WhatsApp configuration...');
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, token')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (configError) {
      console.error('Error retrieving WhatsApp configuration:', configError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'WhatsApp configuration not found', 
          details: configError.message 
        }),
      };
    }
    
    if (!config || !config.phone_number_id || !config.token) {
      console.error('Incomplete WhatsApp configuration:', { 
        hasConfig: !!config,
        hasPhoneNumberId: config ? !!config.phone_number_id : false,
        hasToken: config ? !!config.token : false 
      });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Incomplete WhatsApp configuration', 
          details: 'Missing phone_number_id or token' 
        }),
      };
    }
    
    console.log('WhatsApp configuration retrieved successfully');

    // Préparer la requête pour l'API WhatsApp
    console.log('Preparing WhatsApp API request');
    
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'text',
      text: {
        preview_url: false,
        body: content
      }
    };
    
    console.log('Sending message to WhatsApp API...', { phoneNumberId: config.phone_number_id });
    
    // Envoyer le message via l'API WhatsApp
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const result = await response.json();
    console.log('WhatsApp API response:', { status: response.status, success: response.ok, hasMessages: !!result.messages });

    // Enregistrer le message dans la base de données
    let messageDbResult = null;
    if (result.messages && result.messages.length > 0) {
      const messageId = result.messages[0].id;
      try {
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation_id || null,
            content: content,
            direction: 'outbound',
            status: response.ok ? 'sent' : 'failed',
            type: 'whatsapp',
            metadata: {
              recipient: normalizedTo,
              whatsapp_message_id: messageId,
              ...metadata
            }
          });

        if (messageError) {
          console.error('Error saving message to database:', messageError);
        } else {
          console.log('Message saved to database');  
          messageDbResult = message;
        }
      } catch (dbError) {
        console.error('Exception saving message to database:', dbError);
      }
    }

    if (!response.ok) {
      console.error('WhatsApp API error:', result.error);
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: result.error?.message || 'WhatsApp API error',
          details: result.error,
          request_id: result.error?.fbtrace_id
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        whatsapp_api_result: result,
        database_saved: messageDbResult !== null
      }),
    };
  } catch (error: any) {
    console.error('Unhandled exception:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};
