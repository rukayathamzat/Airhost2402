import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID // Optionnel mais recommandé
});

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { apartmentId, conversationId } = JSON.parse(event.body || '{}');

    if (!apartmentId || !conversationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'apartmentId et conversationId sont requis' })
      };
    }

    // Récupération des données en parallèle
    const [apartmentData, messagesData] = await Promise.all([
      supabase
        .from('properties')
        .select('ai_instructions, name, language')
        .eq('id', apartmentId)
        .single(),
      supabase
        .from('messages')
        .select('content, created_at, direction')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10)
    ]);

    if (apartmentData.error) throw new Error('Erreur de configuration : ' + apartmentData.error.message);
    if (messagesData.error) throw new Error('Erreur messages : ' + messagesData.error.message);

    if (!apartmentData.data || !messagesData.data) {
      throw new Error('Données manquantes pour générer une réponse');
    }

    const prompt = buildPrompt(apartmentData.data, messagesData.data);
    const response = await getAIResponse(prompt);

    // Log de la réponse
    await supabase.from('ai_responses_log').insert({
      apartment_id: apartmentId,
      conversation_id: conversationId,
      generated_response: response,
      prompt_context: prompt
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ response })
    };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' })
    };
  }
};

function buildPrompt(propertyData: any, messages: any[]) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const conversationHistory = messages
    .map(m => `${m.direction}: ${m.content}`)
    .join('\n');

  return `
Tu es un assistant virtuel pour un hôte Airbnb. Réponds au dernier message du client.

[CONFIGURATION]
Propriété: ${propertyData.name || 'Non spécifié'}
Langue: ${propertyData.language || 'fr'}

Instructions IA:
${propertyData.ai_instructions || 'Aucune instruction spécifique'}

[CONVERSATION RÉCENTE]
${conversationHistory}

[DERNIER MESSAGE]
${lastMessage}

[INSTRUCTIONS]
1. Réponds de manière concise (max 3 phrases)
2. Utilise un ton professionnel et amical
3. Intègre les règles et FAQ si pertinent
4. Sois précis et factuel
`;
}

async function getAIResponse(prompt: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // On commence avec 3.5 pour tester, moins cher et plus rapide
      messages: [
        { 
          role: "system", 
          content: "Tu es un assistant virtuel professionnel pour un hôte Airbnb. Tu dois être concis, précis et utile."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
      presence_penalty: 0.5,
      frequency_penalty: 0.3,
      response_format: { type: "text" } // Force une réponse en texte
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Réponse vide de l\'API');
    
    return validateResponse(content);
  } catch (error: any) {
    console.error('Erreur OpenAI:', error?.response?.data || error);
    throw new Error(error?.response?.data?.error?.message || 'Erreur de génération AI');
  }
}

function validateResponse(text: string): string {
  if (!text) throw new Error('Réponse vide');
  if (/(http|@|#)/i.test(text)) throw new Error('Réponse non sécurisée');
  
  return text
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export { handler };
