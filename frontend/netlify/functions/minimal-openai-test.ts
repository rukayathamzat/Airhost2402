import { Handler } from '@netlify/functions';
import OpenAI from 'openai';

export const handler: Handler = async (event, context) => {
  // Log détaillé des variables d'environnement (masquées pour la sécurité)
  console.log('Variables d\'environnement:', {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `Défini (commence par ${process.env.OPENAI_API_KEY?.substring(0, 5)}...)` : 'Non défini',
    OPENAI_ORG_ID: process.env.OPENAI_ORG_ID ? 'Défini' : 'Non défini',
    NODE_VERSION: process.env.NODE_VERSION || 'Non défini'
  });

  try {
    console.log('Initialisation du client OpenAI...');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID // Optionnel
    });
    console.log('Client OpenAI initialisé avec succès');

    // Requête minimale à OpenAI
    console.log('Envoi d\'une requête minimale à OpenAI...');
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Utiliser un modèle standard
        messages: [
          { role: "user", content: "Bonjour, comment ça va?" }
        ],
        max_tokens: 10
      });

      console.log('Réponse OpenAI reçue avec succès:', {
        status: 'success',
        content: completion.choices[0].message.content
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Test OpenAI réussi',
          response: completion.choices[0].message.content
        })
      };
    } catch (openaiError) {
      console.error('Erreur spécifique lors de l\'appel à OpenAI:', {
        name: openaiError.name,
        message: openaiError.message,
        stack: openaiError.stack,
        response: openaiError.response ? {
          status: openaiError.response.status,
          statusText: openaiError.response.statusText,
          data: JSON.stringify(openaiError.response.data)
        } : 'Pas de réponse',
        type: openaiError.type,
        code: openaiError.code
      });

      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Erreur lors de l\'appel à OpenAI',
          details: {
            message: openaiError.message,
            type: openaiError.type,
            code: openaiError.code,
            status: openaiError.response?.status,
            data: openaiError.response?.data
          }
        })
      };
    }
  } catch (error) {
    console.error('Erreur générale:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erreur générale',
        message: error.message
      })
    };
  }
};
