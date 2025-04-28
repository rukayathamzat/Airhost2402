import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1';

// Interface pour la requête
interface GenerateAIRequest {
  apartmentId: string;
  conversationId: string;
}

serve(async (req) => {
  try {
    // Vérifier la méthode HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 405 }
      );
    }

    // Extraire les données de la requête
    const requestData = await req.json();
    console.log('Paramètres reçus:', requestData);

    // Valider les données requises
    const { apartmentId, conversationId } = requestData as GenerateAIRequest;
    
    if (!apartmentId || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'Données manquantes. Assurez-vous de fournir apartmentId et conversationId.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Créer un client Supabase avec les infos d'authentification de service
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('Client Supabase initialisé');

    // Récupérer les informations de la conversation
    const { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .select('*, property:properties(*)')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('Erreur lors de la récupération de la conversation:', conversationError);
      return new Response(
        JSON.stringify({ error: `Conversation avec l'ID ${conversationId} non trouvée` }),
        { headers: { 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    console.log('Conversation récupérée:', conversation.id);

    // Récupérer les messages récents de la conversation
    const { data: messages, error: messagesError } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('Erreur lors de la récupération des messages:', messagesError);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la récupération des messages: ${messagesError.message}` }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log(`${messages?.length || 0} messages récupérés`);

    // Récupérer les instructions AI pour la propriété
    const property = conversation.property;
    const aiInstructions = property?.ai_instructions || '';
    
    console.log('Propriété récupérée:', property?.id);
    console.log('Instructions AI disponibles:', !!aiInstructions);

    // Construire le prompt pour l'API OpenAI
    const recentMessages = messages ? messages.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    })) : [];

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
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    });
    
    if (!Deno.env.get('OPENAI_API_KEY')) {
      console.error('Clé API OpenAI manquante');
      return new Response(
        JSON.stringify({ error: 'Configuration OpenAI incorrecte' }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
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
    const generatedResponse = completion.data.choices[0].message?.content || '';
    console.log('Réponse générée:', generatedResponse.substring(0, 50) + '...');

    return new Response(
      JSON.stringify({ response: generatedResponse }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: `Erreur serveur: ${error.message}` }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
