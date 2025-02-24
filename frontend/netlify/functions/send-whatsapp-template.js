const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  console.log('Function invoked with event:', event);
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { phoneNumber, template, language } = JSON.parse(event.body);

    // Récupérer la configuration WhatsApp la plus récente
    console.log('Connecting to Supabase with URL:', process.env.VITE_SUPABASE_URL);

    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (configError) throw new Error('Erreur lors de la récupération de la configuration WhatsApp');
    if (!whatsappConfig || whatsappConfig.length === 0) throw new Error('Aucune configuration WhatsApp trouvée');

    const whatsappToken = whatsappConfig[0].token;
    const phoneNumberId = whatsappConfig[0].phone_number_id;

    if (!whatsappToken || !phoneNumberId) {
      throw new Error('Configuration WhatsApp manquante');
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'template',
          template: {
            name: template,
            language: {
              code: language
            }
          }
        })
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
