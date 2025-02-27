import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID // Optionnel mais recommandé
});

export const handler: Handler = async (event, context) => {
  try {
    // Vérifier la méthode et cors
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Méthode non autorisée' };
    }

    console.log('Reçu une requête pour generate-ai-response');
    
    // Extraire les paramètres de la requête
    const { apartmentId, conversationId } = JSON.parse(event.body || '{}');
    if (!apartmentId || !conversationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'apartmentId et conversationId sont requis' })
      };
    }

    console.log(`Traitement de la requête pour l'appartement ${apartmentId} et la conversation ${conversationId}`);

    // Utilisation de l'instance Supabase déjà initialisée en haut du fichier
    // au lieu d'en créer une nouvelle

    // Récupérer les données de l'appartement
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', apartmentId)
      .single();

    if (propertyError || !propertyData) {
      console.error('Erreur lors de la récupération des données de l\'appartement:', propertyError);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Appartement non trouvé' })
      };
    }

    console.log(`Appartement récupéré: ${propertyData.name}`);

    // Récupérer les messages de la conversation
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Erreur lors de la récupération des messages:', messagesError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Erreur lors de la récupération des messages' })
      };
    }

    console.log(`${messagesData.length} messages récupérés pour la conversation ${conversationId}`);

    // Construire le prompt en intégrant les informations de l'appartement
    const prompt = buildPrompt(propertyData, messagesData);
    console.log('Prompt construit (début):', prompt.substring(0, 200) + '...');

    // Ajouter le prompt comme message système dans l'historique pour OpenAI
    const augmentedMessages = [...messagesData];
    
    // Ajouter une entrée spéciale pour le prompt système
    augmentedMessages.unshift({
      id: 'system-prompt',
      conversation_id: conversationId,
      direction: 'system',
      content: prompt,
      created_at: new Date().toISOString(),
      read: true
    });

    // Obtenir la réponse AI avec l'historique augmenté
    const response = await getAIResponse(prompt, augmentedMessages);
    console.log('Réponse AI générée:', response.substring(0, 100) + '...');

    return {
      statusCode: 200,
      body: JSON.stringify({ response })
    };
  } catch (error: any) {
    console.error('Erreur générale:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Erreur interne du serveur' })
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
    // Debug: Afficher les 5 derniers messages de la conversation
    console.log('Messages récents de la conversation:', 
      messages.slice(-5).map(m => ({ 
        direction: m.direction, 
        content: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '') 
      }))
    );
    
    // Convertir l'historique des messages en format ChatGPT
    const messageHistory = messages.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Filtrer les messages qui contiennent "Template envoyé:" pour éviter la confusion
    const filteredHistory = messageHistory.filter(msg => 
      !msg.content.startsWith('Template envoyé:')
    );
    
    console.log('Historique filtré pour OpenAI:', 
      filteredHistory.slice(-5).map(m => ({ 
        role: m.role, 
        content: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '') 
      }))
    );

    // Message système qui contient toutes les informations sur la propriété
    const systemMessage = {
      role: "system",
      content: "Tu es un assistant virtuel professionnel pour un hôte Airbnb. Tu dois :\n1. Répondre de manière personnalisée et spécifique\n2. Utiliser les informations fournies sur la propriété\n3. Être chaleureux et professionnel\n4. Te concentrer sur les besoins exprimés par l'invité\n5. Utiliser un ton conversationnel naturel"
    };
    
    // Ne pas mettre le prompt complet dans un message utilisateur
    // car cela remplacerait la conversation
    const chatMessages = [
      systemMessage,
      ...filteredHistory // Inclure uniquement l'historique filtré sans ajouter de nouveau message utilisateur
    ];
    
    console.log('Structure finale des messages envoyés à OpenAI:', {
      model: 'gpt-4o-mini',
      messageCount: chatMessages.length,
      systemMessagePreview: chatMessages[0].content.substring(0, 50) + '...',
      lastMessage: chatMessages[chatMessages.length - 1]?.content.substring(0, 50) + '...'
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
