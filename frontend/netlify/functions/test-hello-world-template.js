const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  console.log('Test hello_world template function invoked');
  
  // Créer le client Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('Supabase URL:', supabaseUrl);
  console.log('Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('Using anon key:', !!process.env.VITE_SUPABASE_ANON_KEY);
  
  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase credentials' })
    };
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Récupérer la configuration WhatsApp la plus récente
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('WhatsApp config response:', { 
      config: whatsappConfig ? whatsappConfig[0] : null,
      error: configError 
    });

    if (configError) throw new Error('Erreur lors de la récupération de la configuration WhatsApp');
    if (!whatsappConfig || whatsappConfig.length === 0) throw new Error('Aucune configuration WhatsApp trouvée');

    const whatsappToken = whatsappConfig[0].token;
    const phoneNumberId = whatsappConfig[0].phone_number_id;

    if (!whatsappToken || !phoneNumberId) {
      throw new Error('Configuration WhatsApp incomplète');
    }
    
    // Récupérer la conversation active pour obtenir le numéro de téléphone
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (convError || !conversations || conversations.length === 0) {
      throw new Error('Aucune conversation trouvée');
    }
    
    // Utiliser le guest_phone de la conversation
    const to = conversations[0].guest_phone;
    console.log('Sending to phone number:', to);
    
    // Paramètres fixes pour le test
    const template_name = 'hello_world';
    const language = 'en_US';

    console.log('Sending WhatsApp template with:', { 
      phoneNumberId, 
      template: template_name, 
      language, 
      to,
      tokenLength: whatsappToken.length 
    });

    // Appel à l'API WhatsApp
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
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
          }
        })
      }
    );

    const responseData = await response.json();
    console.log('WhatsApp API response:', { 
      status: response.status, 
      statusText: response.statusText,
      data: responseData 
    });

    // Enregistrer le résultat dans la base de données
    if (response.ok) {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversations[0].id,
          content: `Template envoyé: hello_world (test)`,
          type: 'template',
          direction: 'outbound',
          status: 'sent',
          metadata: {
            template_name: 'hello_world',
            whatsapp_response: responseData
          }
        });
        
      if (msgError) {
        console.error('Erreur lors de l\'enregistrement du message:', msgError);
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: response.ok,
        whatsappResponse: responseData,
        phoneNumberId,
        to
      })
    };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack
      })
    };
  }
};
