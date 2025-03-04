import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Vérifier la clé API OpenAI
const openaiApiKey = process.env.OPENAI_API_KEY || '';

// Logs pour le débogage (masquer la plupart de la clé)
const maskedKey = openaiApiKey ? 
  `${openaiApiKey.substring(0, 7)}...${openaiApiKey.substring(openaiApiKey.length - 4)}` : 
  'Non définie';

console.log('Configuration OpenAI:', {
  apiKeyPresent: !!openaiApiKey,
  apiKeyType: openaiApiKey.startsWith('sk-') ? 'Clé secrète standard' : 
             openaiApiKey.startsWith('sk-org-') ? 'Clé d\'organisation' : 
             openaiApiKey.startsWith('sk-proj-') ? 'Clé de projet' : 
             'Format inconnu',
  apiKeyMasked: maskedKey,
  orgIdPresent: !!process.env.OPENAI_ORG_ID
});

// Vérifier si la clé a un format valide
if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
  console.error('ERREUR: La clé API OpenAI est invalide ou manquante');
}

// Initialiser OpenAI avec la clé API
const openai = new OpenAI({
  apiKey: openaiApiKey,
  organization: process.env.OPENAI_ORG_ID // Optionnel
});

export const handler: Handler = async (event, context) => {
  try {
    // Vérifier la méthode et cors
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Méthode non autorisée' };
    }

    console.log('Reçu une requête pour generate-ai-response');
    
    // Extraire les paramètres de la requête
    const { apartmentId, conversationId, messages: directMessages, customInstructions, isReservation } = JSON.parse(event.body || '{}');
    if (!apartmentId || !conversationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'apartmentId et conversationId sont requis' })
      };
    }

    console.log(`Traitement de la requête pour l'appartement ${apartmentId} et la conversation ${conversationId}`);
    console.log(`Mode Sandbox: ${directMessages ? 'Oui' : 'Non'}`);

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

    // Récupérer les messages de la conversation (sauf si fournis directement)
    let messagesData = directMessages;
    if (!messagesData) {
      const { data, error: messagesError } = await supabase
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
      
      messagesData = data;
      console.log(`${messagesData.length} messages récupérés pour la conversation ${conversationId}`);
    } else {
      console.log(`Utilisation de ${messagesData.length} messages fournis directement`);
    }

    // Construire le prompt en intégrant les informations de l'appartement
    const prompt = buildPrompt(propertyData, messagesData, customInstructions, isReservation);
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

function buildPrompt(propertyData: any, messages: any[], customInstructions: string, isReservation: boolean) {
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

[INSTRUCTIONS PERSONNALISÉES]
${customInstructions || ''}

[MODE RÉSERVATION]
${isReservation ? 'Actif' : 'Inactif'}

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

    // Message système simplifié
    const systemMessage = {
      role: "system",
      content: "Tu es un assistant virtuel pour un hôte Airbnb. Réponds de manière personnalisée, chaleureuse et professionnelle."
    };
    
    // Ajouter un message utilisateur avec le prompt
    const promptMessage = {
      role: "user",
      content: prompt
    };
    
    // Simplifier la structure des messages
    const chatMessages = [
      systemMessage,
      promptMessage
    ];
    
    // Ajouter les 3 derniers messages de l'historique pour le contexte
    if (filteredHistory.length > 0) {
      const recentHistory = filteredHistory.slice(-3);
      chatMessages.push(...recentHistory);
    }
    
    console.log('Structure finale des messages envoyés à OpenAI:', {
      model: 'gpt-4o-mini',
      messageCount: chatMessages.length,
      systemMessage: systemMessage.content,
      promptMessage: promptMessage.content.substring(0, 50) + '...',
      apiKey: process.env.OPENAI_API_KEY ? 'Défini (premiers caractères: ' + process.env.OPENAI_API_KEY.substring(0, 3) + '...)' : 'Non défini'
    });

    // Simplifier l'appel à OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.8,
      max_tokens: 250,
    });

    console.log('Réponse OpenAI reçue:', {
      status: 'success',
      content: response.choices[0].message.content
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Réponse vide de l\'API');
    
    return validateResponse(content);
  } catch (error: any) {
    console.error('Erreur OpenAI détaillée:', {
      error: JSON.stringify(error?.response?.data || error),
      message: error?.message,
      status: error?.response?.status,
      stack: error?.stack
    });
    throw new Error(error?.message || 'Erreur de génération AI');
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
