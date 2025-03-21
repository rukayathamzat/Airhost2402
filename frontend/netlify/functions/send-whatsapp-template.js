const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Fonction pour normaliser un numéro de téléphone
function normalizePhoneNumber(phoneNumber) {
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

exports.handler = async function(event, context) {
  console.log('Function invoked with event:', event.httpMethod);
  
  // Initialiser Supabase avec une clé de service si disponible pour plus de fiabilité
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Supabase credentials not configured' })
    };
  }
  
  console.log('Using Supabase URL:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Extraire et valider les données du corps de la requête
    let { to, template_name = 'hello_world', language = 'en_US', template_params = [] } = JSON.parse(event.body);
    
    if (!to) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Le numéro de téléphone est requis' })
      };
    }
    
    // Normaliser le numéro de téléphone
    to = normalizePhoneNumber(to);
    
    console.log('Parsed request body:', { to, template_name, language, hasTemplateParams: !!template_params.length });
    console.log('Using default template "hello_world" if not specified');

    // Récupérer la configuration WhatsApp la plus récente
    console.log('Récupération de la configuration WhatsApp...');

    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (configError) {
      console.error('Erreur lors de la récupération de la configuration WhatsApp:', configError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Erreur lors de la récupération de la configuration WhatsApp' })
      };
    }

    console.log('WhatsApp config récupérée avec succès');

    if (!whatsappConfig) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Aucune configuration WhatsApp trouvée' })
      };
    }

    const whatsappToken = whatsappConfig.token;
    const phoneNumberId = whatsappConfig.phone_number_id;

    if (!whatsappToken || !phoneNumberId) {
      console.error('Configuration WhatsApp incomplète:', { hasToken: !!whatsappToken, hasPhoneNumberId: !!phoneNumberId });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Configuration WhatsApp incomplète. Vérifiez que le token et le phone number ID sont configurés.' })
      };
    }

    console.log('Sending WhatsApp message with:', { phoneNumberId, template: template_name, language, to });
    
    // Préparer le payload pour l'API WhatsApp
    const requestBody = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: template_name,
        language: {
          code: language
        }
      }
    };
    
    // Ajouter les paramètres du template s'ils sont fournis
    if (template_params && template_params.length > 0) {
      requestBody.template.components = [
        {
          type: 'body',
          parameters: template_params.map(param => {
            return { type: 'text', text: param.toString() };
          })
        }
      ];
    }
    
    console.log('Payload API WhatsApp:', JSON.stringify(requestBody));

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await response.json();
    console.log('WhatsApp API response:', { status: response.status, data });
    
    // Enregistrer les données du template envoyé
    const responseStatus = response.status;
    
    // Stocker les métadonnées complètes pour référence future
    if (data.messages && data.messages.length > 0) {
      try {
        const { data: templateData, error: templateError } = await supabase
          .from('messages')
          .insert({
            conversation_id: null, // Sera mis à jour plus tard si nécessaire
            content: `Template envoyé: ${template_name}`,
            direction: 'outbound',
            type: 'template',
            status: responseStatus >= 200 && responseStatus < 300 ? 'sent' : 'failed',
            metadata: {
              template_name: template_name,
              template_language: language,
              recipient: to,
              whatsapp_message_id: data.messages[0].id,
              params: template_params
            }
          });
          
        if (templateError) {
          console.error('Erreur lors de l\'enregistrement du template envoyé:', templateError);
        } else {
          console.log('Template envoyé enregistré avec succès');
        }
      } catch (error) {
        console.error('Exception lors de l\'enregistrement du template:', error);
      }
    }
    
    // Retourner un message d'erreur si l'API WhatsApp a renvoyé une erreur
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data.error?.message || 'Erreur lors de l\'envoi du message WhatsApp',
          details: data.error
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Template WhatsApp envoyé avec succès',
        data: data
      })
    };
  } catch (error) {
    console.error('Exception non gérée:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Erreur interne du serveur', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
