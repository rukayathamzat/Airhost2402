// @ts-ignore
import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Log détaillé des variables d'environnement (masquées pour la sécurité)
console.log('Variables d\'environnement pour analyze-message:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Défini' : 'Non défini',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Défini' : 'Non défini',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `Défini (commence par ${process.env.OPENAI_API_KEY?.substring(0, 5)}...)` : 'Non défini',
  OPENAI_ORG_ID: process.env.OPENAI_ORG_ID ? 'Défini' : 'Non défini',
  NODE_VERSION: process.env.NODE_VERSION || 'Non défini'
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

console.log('Client Supabase initialisé pour analyze-message');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID // Optionnel mais recommandé
});

console.log('Client OpenAI initialisé pour analyze-message');

interface AnalysisResult {
  canRespond: boolean;
  isUrgent: boolean;
  isUnhappy: boolean;
  explanation: string;
}

export const handler: Handler = async (event, context) => {
  try {
    // Vérifier la méthode et cors
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Méthode non autorisée' };
    }

    console.log('Reçu une requête pour analyze-message');
    
    // Extraire les paramètres de la requête
    const { messageId, messageContent, apartmentId, conversationId } = JSON.parse(event.body || '{}');
    
    if (!messageContent) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Le contenu du message est requis' })
      };
    }

    console.log(`Analyse du message ${messageId || 'sans ID'} pour la conversation ${conversationId || 'inconnue'}`);

    // Récupérer les données de l'appartement si l'ID est fourni (pour contexte)
    let propertyData = null;
    if (apartmentId) {
      console.log(`Tentative de récupération de l'appartement avec ID: ${apartmentId}`);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', apartmentId)
        .single();

      if (error) {
        console.warn('Impossible de récupérer les données de l\'appartement:', error);
      } else if (data) {
        propertyData = data;
        console.log(`Appartement récupéré pour contexte:`, {
          id: data.id,
          name: data.name
        });
      }
    }

    // Analyser le message avec OpenAI
    const analysisResult = await analyzeMessage(messageContent, propertyData);
    console.log('Résultat de l\'analyse:', analysisResult);

    // Si un ID de message est fourni, mettre à jour les métadonnées du message
    if (messageId) {
      try {
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            metadata: {
              analysis: analysisResult
            }
          })
          .eq('id', messageId);

        if (updateError) {
          console.error('Erreur lors de la mise à jour des métadonnées du message:', updateError);
        } else {
          console.log(`Métadonnées mises à jour pour le message ${messageId}`);
        }
      } catch (updateError) {
        console.error('Exception lors de la mise à jour des métadonnées:', updateError);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(analysisResult)
    };
  } catch (error: any) {
    console.error('Erreur générale dans analyze-message:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Erreur interne du serveur' })
    };
  }
};

async function analyzeMessage(messageContent: string, propertyData: any = null): Promise<AnalysisResult> {
  console.log('Analyse du message avec OpenAI:', messageContent.substring(0, 50) + '...');

  // Construire le prompt pour l'analyse
  const systemPrompt = `
Tu es un assistant d'analyse de messages pour une plateforme de location de logements. 
Ta tâche est d'analyser le message d'un client et de déterminer les éléments suivants :

1. Si tu es en capacité de répondre au message selon la base de données disponible (canRespond)
2. Si le message indique une urgence qui nécessite une attention immédiate (isUrgent)
3. Si le client semble mécontent ou frustré (isUnhappy)

Réponds UNIQUEMENT avec un objet JSON contenant ces trois évaluations (true/false) et une brève explication.
Format attendu:
{
  "canRespond": boolean,
  "isUrgent": boolean,
  "isUnhappy": boolean,
  "explanation": "Brève explication de ton analyse"
}

${propertyData ? `
Informations sur le logement concerné :
- Nom: ${propertyData.name}
- Description: ${propertyData.description || 'Non disponible'}
- Équipements: ${propertyData.amenities ? JSON.stringify(propertyData.amenities) : 'Non disponibles'}
- Règles: ${propertyData.rules || 'Non disponibles'}
` : ''}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messageContent }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('Réponse OpenAI vide ou invalide');
      return {
        canRespond: false,
        isUrgent: false,
        isUnhappy: false,
        explanation: "Erreur d'analyse: réponse vide"
      };
    }

    try {
      const parsedResult = JSON.parse(content) as AnalysisResult;
      return {
        canRespond: !!parsedResult.canRespond,
        isUrgent: !!parsedResult.isUrgent,
        isUnhappy: !!parsedResult.isUnhappy,
        explanation: parsedResult.explanation || "Aucune explication fournie"
      };
    } catch (parseError) {
      console.error('Erreur lors du parsing de la réponse JSON:', parseError);
      console.log('Contenu brut reçu:', content);
      return {
        canRespond: false,
        isUrgent: false,
        isUnhappy: false,
        explanation: "Erreur d'analyse: format de réponse invalide"
      };
    }
  } catch (openaiError: any) {
    console.error('Erreur lors de l\'appel à OpenAI:', openaiError);
    return {
      canRespond: false,
      isUrgent: false,
      isUnhappy: false,
      explanation: `Erreur d'analyse: ${openaiError.message || 'erreur inconnue'}`
    };
  }
}
