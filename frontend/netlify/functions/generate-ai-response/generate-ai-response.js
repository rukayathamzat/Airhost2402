// Fonction Netlify pour générer des réponses IA personnalisées
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');

exports.handler = async (event, context) => {
  console.log('Fonction generate-ai-response appelée');
  
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' })
    };
  }

  try {
    // Extraire les données de la requête
    const { apartmentId, conversationId } = JSON.parse(event.body);
    console.log('Paramètres reçus:', { apartmentId, conversationId });

    if (!apartmentId || !conversationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Données manquantes. Assurez-vous de fournir apartmentId et conversationId.' })
      };
    }

    // Initialiser le client Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variables d\'environnement Supabase manquantes');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Configuration Supabase incorrecte' })
      };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Client Supabase initialisé');

    // Récupérer les informations de la conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*, property:properties(*)')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('Erreur lors de la récupération de la conversation:', conversationError);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Conversation avec l'ID ${conversationId} non trouvée` })
      };
    }
    
    console.log('Conversation récupérée:', conversation.id);

    // Récupérer les messages récents de la conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('Erreur lors de la récupération des messages:', messagesError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Erreur lors de la récupération des messages: ${messagesError.message}` })
      };
    }
    
    console.log(`${messages.length} messages récupérés`);

    // Récupérer les instructions AI pour la propriété
    const property = conversation.property;
    const aiInstructions = property?.ai_instructions || '';
    
    console.log('Propriété récupérée:', property?.id);
    console.log('Instructions AI disponibles:', !!aiInstructions);

    // Construire le prompt pour l'API OpenAI
    const recentMessages = messages.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Ajouter un message système avec les instructions personnalisées
    const systemMessage = {
      role: 'system',
      content: `Tu es un assistant virtuel pour un hôte Airbnb. Tu dois répondre aux questions des invités de manière professionnelle et amicale.
      
      Informations sur la propriété:
      - Nom de l'invité: ${conversation.guest_name}
      - Dates de séjour: du ${conversation.check_in_date} au ${conversation.check_out_date}
      
      Instructions spécifiques pour cette propriété:
      ${aiInstructions}
      
      Réponds de manière concise et utile. N'invente pas d'informations qui ne sont pas mentionnées dans les instructions.`
    };
    
    console.log('Messages formatés pour OpenAI');

    // Initialiser l'API OpenAI
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('Clé API OpenAI manquante');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Configuration OpenAI incorrecte' })
      };
    }
    
    const openai = new OpenAIApi(configuration);
    console.log('API OpenAI initialisée');

    // Appeler l'API OpenAI
    console.log('Appel de l\'API OpenAI en cours...');
    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [systemMessage, ...recentMessages],
      max_tokens: 500,
      temperature: 0.7
    });
    
    console.log('Réponse OpenAI reçue');

    // Extraire la réponse générée
    const generatedResponse = completion.data.choices[0].message.content;
    console.log('Réponse générée:', generatedResponse.substring(0, 50) + '...');

    return {
      statusCode: 200,
      body: JSON.stringify({ response: generatedResponse })
    };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Erreur serveur: ${error.message}` })
    };
  }
};
