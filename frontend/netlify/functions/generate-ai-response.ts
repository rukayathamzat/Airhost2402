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
        .select('ai_instructions, name, language, description, amenities, rules, faq')
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

    // Générer une réponse IA
    const prompt = buildPrompt(apartmentData.data, messagesData.data);
    const response = await getAIResponse(prompt, messagesData.data);

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
  // Récupérer les 5 derniers messages pour fournir un contexte plus riche
  const recentMessages = messages.slice(-5).map(msg => 
    `${msg.direction === 'inbound' ? 'INVITÉ' : 'HÔTE'}: ${msg.content}`
  ).join('\n');
  
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  // Gestion sécurisée des données JSON
  const safeParseJson = (data: any) => {
    if (!data) return {};
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return {};
    }
  };

  // Récupération sécurisée des données
  const amenities = safeParseJson(propertyData.amenities);
  const rules = safeParseJson(propertyData.rules);
  const faq = safeParseJson(propertyData.faq);
  const aiInstructions = propertyData.ai_instructions || '';

  // Construction des sections si les données existent
  const buildSection = (title: string, data: Record<string, any>, format: (k: string, v: any) => string = (k, v) => `- ${k}: ${v}`) => {
    const entries = Object.entries(data);
    return entries.length > 0 ? `\n[${title}]\n${entries.map(([k, v]) => format(k, v)).join('\n')}` : '';
  };

  const amenitiesSection = buildSection('COMMODITÉS', amenities);
  const rulesSection = buildSection('RÈGLES', rules);
  const faqSection = buildSection('FAQ', faq, (q, a) => `Q: ${q}\nR: ${a}`);

  return `
Tu es l'assistant virtuel personnel de ${propertyData.name || 'cet hébergement'}. Tu représentes l'hôte et dois répondre de manière professionnelle, personnelle et précise.

[PROPRIÉTÉ]
Nom: ${propertyData.name || 'Non spécifié'}
Description: ${propertyData.description || ''}
Langue: ${propertyData.language || 'fr'}
${amenitiesSection}${rulesSection}${faqSection}

[INSTRUCTIONS SPÉCIFIQUES DE L'HÔTE]
${aiInstructions}

[INSTRUCTIONS GÉNÉRALES]
1. Sois chaleureux, professionnel et personnalisé dans tes réponses
2. Réponds précisément à la question en utilisant les informations de la propriété
3. Si l'information n'est pas disponible, suggère poliment à l'invité de contacter directement l'hôte
4. Adapte le ton et le style selon le contexte de la conversation
5. Évite les réponses génériques - sois spécifique à cette propriété
6. Inclus le nom de la propriété dans ta réponse quand c'est pertinent
7. Limite ta réponse à un maximum de 3-4 phrases concises

[CONVERSATION RÉCENTE]
${recentMessages}

[DERNIÈRE QUESTION DE L'INVITÉ]
${lastMessage}

[TA RÉPONSE DOIT ÊTRE]
- Personnalisée pour ${propertyData.name || 'cet hébergement'}
- Directement liée à la question posée
- Contenir des informations spécifiques et utiles
- Professionnelle mais chaleureuse
`;
}

async function getAIResponse(prompt: string, messages: any[]) {
  try {
    // Convertir l'historique des messages en format ChatGPT
    const messageHistory = messages.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Filtrer les messages qui contiennent "Template envoyé:" pour éviter la confusion
    const filteredHistory = messageHistory.filter(msg => 
      !msg.content.startsWith('Template envoyé:')
    );

    // Ajouter le contexte système et le prompt actuel
    const chatMessages = [
      { 
        role: "system", 
        content: "Tu es un assistant virtuel professionnel pour un hôte Airbnb. Tu dois :\n1. Répondre de manière personnalisée et spécifique\n2. Utiliser les informations fournies sur la propriété\n3. Être chaleureux et professionnel\n4. Te concentrer sur les besoins exprimés par l'invité\n5. Utiliser un ton conversationnel naturel"
      },
      ...filteredHistory, // Inclure l'historique filtré des messages
      { 
        role: "user", 
        content: prompt 
      }
    ];

    console.log('Envoi de la requête OpenAI avec les paramètres:', {
      model: 'gpt-4o-mini',
      messagesCount: chatMessages.length,
      lastMessage: chatMessages[chatMessages.length - 1]?.content.substring(0, 100) + '...'
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modèle optimisé pour la rapidité
      messages: chatMessages,
      temperature: 0.8, // Légèrement plus créatif
      max_tokens: 250, // Augmenter pour des réponses plus détaillées
      presence_penalty: 0.6,
      frequency_penalty: 0.6,
      response_format: { type: "text" }
    });

    console.log('Réponse OpenAI reçue:', {
      status: 'success',
      content: completion.choices[0].message.content
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Réponse vide de l\'API');
    
    return validateResponse(content);
  } catch (error: any) {
    console.error('Erreur OpenAI:', {
      error: error?.response?.data || error,
      message: error?.message,
      status: error?.response?.status
    });
    throw new Error(error?.response?.data?.error?.message || 'Erreur de génération AI');
  }
}

function validateResponse(text: string): string {
  if (!text) throw new Error('Réponse vide');
  if (/(http|@|#)/i.test(text)) throw new Error('Réponse non sécurisée');
  
  // Conserver les sauts de ligne pour une meilleure lisibilité
  // mais remplacer les sauts multiples par un seul
  return text
    .replace(/\n{3,}/g, '\n\n')  // Remplacer 3+ sauts de ligne par 2
    .trim();
}

export { handler };
