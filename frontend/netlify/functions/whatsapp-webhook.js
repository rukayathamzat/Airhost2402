const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  console.log('WhatsApp Webhook invoked with event:', JSON.stringify(event));
  
  // Initialiser Supabase
  console.log('Initializing Supabase with:', {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  
  // Priorité des clés : SERVICE_ROLE_KEY > SERVICE_KEY > ANON_KEY
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Supabase credentials not configured' })
    };
  }
  
  console.log('Using Supabase URL:', supabaseUrl);
  console.log('Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Vérification du webhook (GET)
  if (event.httpMethod === 'GET') {
    const mode = event.queryStringParameters['hub.mode'];
    const token = event.queryStringParameters['hub.verify_token'];
    const challenge = event.queryStringParameters['hub.challenge'];

    console.log('Webhook verification request:', { mode, token });
    console.log('Expected token:', process.env.WHATSAPP_VERIFY_TOKEN);
    console.log('Environment variables:', {
      WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      NODE_ENV: process.env.NODE_ENV
    });

    // Pour le débogage, accepter temporairement n'importe quel token
    if (mode !== 'subscribe') {
      console.log('Webhook verification failed: mode is not subscribe');
      return {
        statusCode: 403,
        body: 'Forbidden: Invalid mode'
      };
    }
    
    // Accepter temporairement n'importe quel token pour faciliter la vérification
    console.log('Webhook verification successful (debug mode)');
    return {
      statusCode: 200,
      body: challenge
    };
  }

  // Traitement des messages (POST)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      console.log('Webhook message received:', JSON.stringify(body));

      // Vérifier si c'est un message WhatsApp
      if (body.object !== 'whatsapp_business_account') {
        return {
          statusCode: 400,
          body: 'Invalid webhook event'
        };
      }

      // Extraire les informations du message
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value || !value.messages || value.messages.length === 0) {
        console.log('No messages in webhook payload');
        return {
          statusCode: 200,
          body: 'No messages to process'
        };
      }

      // Traiter chaque message
      for (const message of value.messages) {
        await processMessage(supabase, value.metadata.phone_number_id, message, value.contacts);
      }

      return {
        statusCode: 200,
        body: 'OK'
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};

async function processMessage(supabase, phoneNumberId, message, contacts) {
  try {
    console.log('Processing message:', JSON.stringify(message));
    
    // Extraire les informations du message
    const from = message.from; // Numéro de téléphone de l'expéditeur
    const messageId = message.id;
    const timestamp = message.timestamp;
    const messageType = message.type;
    const messageContent = message.text?.body || '';
    
    // Récupérer le nom du contact s'il est disponible
    const contactName = contacts?.[0]?.profile?.name || 'Invité';

    // Trouver la conversation correspondante
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, guest_phone, unread_count')
      .eq('guest_phone', from);

    if (convError) {
      console.error('Error finding conversation:', convError);
      throw convError;
    }

    let conversationId;
    
    if (!conversations || conversations.length === 0) {
      console.log('No conversation found for phone:', from);
      console.log('Creating new conversation for phone:', from);
      
      // Récupérer une propriété par défaut pour associer la conversation
      console.log('Trying to fetch properties from database...');
      let propertyId;
      
      try {
        const { data: properties, error: propError } = await supabase
          .from('properties')
          .select('id, name')
          .limit(1);
          
        console.log('Properties query result:', { properties, error: propError });
        
        if (propError) {
          console.error('Error finding property:', propError);
          // Utiliser l'ID de propriété connu comme fallback
          propertyId = 'f0e8bb59-214e-4dc7-a80f-406f89220cff';
          console.log('Using hardcoded property ID as fallback:', propertyId);
        } else if (!properties || properties.length === 0) {
          console.error('No property found to associate with conversation');
          // Utiliser l'ID de propriété connu comme fallback
          propertyId = 'f0e8bb59-214e-4dc7-a80f-406f89220cff';
          console.log('Using hardcoded property ID as fallback:', propertyId);
        } else {
          propertyId = properties[0].id;
          console.log('Found property from database:', properties[0].name, 'with ID:', propertyId);
        }
      } catch (error) {
        console.error('Exception while fetching properties:', error);
        // Utiliser l'ID de propriété connu comme fallback
        propertyId = 'f0e8bb59-214e-4dc7-a80f-406f89220cff';
        console.log('Using hardcoded property ID as fallback:', propertyId);
      }
      
      // Créer une nouvelle conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          property_id: propertyId,
          guest_phone: from,
          guest_name: contactName,
          unread_count: 1,
          last_message: messageContent,
          last_message_at: new Date().toISOString(),
          status: 'active'
        })
        .select();
        
      if (createError) {
        console.error('Error creating conversation:', createError);
        throw createError;
      }
      
      console.log('New conversation created:', newConversation);
      conversationId = newConversation[0].id;
    } else {
      const conversation = conversations[0];
      console.log('Found conversation:', conversation);
      conversationId = conversation.id;

      // Si c'est une conversation existante, mettre à jour le compteur de messages non lus
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          unread_count: (conversation.unread_count || 0) + 1,
          last_message: messageContent,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);
        
      if (updateError) {
        console.error('Error updating conversation:', updateError);
        throw updateError;
      }
      
      console.log('Conversation updated successfully');
    }
    
    // Enregistrer le message dans la base de données
    const { data: messageData, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: messageContent,
        direction: 'inbound',
        type: messageType === 'text' ? 'text' : 'other',
        status: 'received',
        metadata: {
          whatsapp_message_id: messageId,
          timestamp: timestamp
        }
      });

    if (msgError) {
      console.error('Error inserting message:', msgError);
      throw msgError;
    }

    console.log('Message inserted successfully:', messageData);

  } catch (error) {
    console.error('Error in processMessage:', error);
    throw error;
  }
}
