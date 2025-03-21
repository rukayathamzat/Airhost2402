import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event, context) => {
  try {
    // Vérifier la méthode et cors
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Méthode non autorisée' };
    }

    console.log('Reçu une requête pour test-ai-response');
    
    // Vérifier les variables d'environnement
    const envCheck = {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'Défini' : 'Non défini',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Défini' : 'Non défini',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Défini' : 'Non défini',
      OPENAI_ORG_ID: process.env.OPENAI_ORG_ID ? 'Défini' : 'Non défini'
    };
    
    console.log('Vérification des variables d\'environnement:', envCheck);
    
    // Si des variables d'environnement essentielles sont manquantes, renvoyer une erreur
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Variables d\'environnement manquantes', 
          details: envCheck 
        })
      };
    }
    
    // Initialiser Supabase
    console.log('Initialisation de Supabase...');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test de connexion à Supabase
    try {
      console.log('Test de connexion à Supabase...');
      const { data: testData, error: testError } = await supabase.from('properties').select('count').limit(1);
      if (testError) {
        console.error('Erreur lors du test de connexion à Supabase:', testError);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Erreur de connexion à Supabase', 
            details: testError 
          })
        };
      }
      console.log('Connexion à Supabase réussie, données de test:', testData);
    } catch (supabaseError) {
      console.error('Exception lors du test de connexion à Supabase:', supabaseError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Exception lors de la connexion à Supabase', 
          details: supabaseError 
        })
      };
    }
    
    // Initialiser OpenAI
    console.log('Initialisation d\'OpenAI...');
    let openai;
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID // Optionnel
      });
    } catch (openaiError) {
      console.error('Erreur lors de l\'initialisation d\'OpenAI:', openaiError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Erreur d\'initialisation d\'OpenAI', 
          details: openaiError 
        })
      };
    }
    
    // Test d'appel à l'API OpenAI
    try {
      console.log('Test d\'appel à l\'API OpenAI...');
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu es un assistant utile." },
          { role: "user", content: "Bonjour, comment vas-tu?" }
        ],
        max_tokens: 50
      });
      
      console.log('Réponse OpenAI reçue:', completion.choices[0].message);
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Tests réussis',
          supabaseConnection: 'OK',
          openaiConnection: 'OK',
          openaiResponse: completion.choices[0].message.content
        })
      };
    } catch (openaiCallError: any) {
      console.error('Erreur lors de l\'appel à l\'API OpenAI:', {
        error: openaiCallError?.response?.data || openaiCallError,
        message: openaiCallError?.message,
        status: openaiCallError?.response?.status
      });
      
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Erreur d\'appel à l\'API OpenAI', 
          details: {
            message: openaiCallError?.message,
            response: openaiCallError?.response?.data,
            status: openaiCallError?.response?.status
          }
        })
      };
    }
  } catch (error: any) {
    console.error('Erreur générale:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Erreur interne du serveur',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
