import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event, context) => {
  // Log détaillé des variables d'environnement (masquées pour la sécurité)
  console.log('Variables d\'environnement Supabase:', {
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Défini' : 'Non défini',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Défini' : 'Non défini'
  });

  try {
    console.log('Initialisation du client Supabase...');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    console.log('Client Supabase initialisé avec succès');

    // Récupérer les paramètres de la requête
    const params = event.queryStringParameters || {};
    const apartmentId = params.apartmentId || '';
    const conversationId = params.conversationId || '';

    if (!apartmentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Paramètre apartmentId requis' })
      };
    }

    // Test 1: Récupérer un appartement
    console.log(`Test 1: Récupération de l'appartement avec ID: ${apartmentId}`);
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', apartmentId)
      .single();

    if (propertyError) {
      console.error('Erreur lors de la récupération des données de l\'appartement:', {
        code: propertyError.code,
        message: propertyError.message,
        details: propertyError.details,
        hint: propertyError.hint
      });
      
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Appartement non trouvé',
          details: propertyError
        })
      };
    }

    if (!propertyData) {
      console.error('Aucune donnée d\'appartement trouvée pour l\'ID:', apartmentId);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Appartement non trouvé (données nulles)' })
      };
    }

    // Informations sur l'appartement récupéré
    const propertyInfo = {
      id: propertyData.id,
      name: propertyData.name,
      hasDescription: !!propertyData.description,
      hasAmenities: !!propertyData.amenities,
      amenitiesType: typeof propertyData.amenities,
      hasRules: !!propertyData.rules,
      rulesType: typeof propertyData.rules,
      hasFaq: !!propertyData.faq,
      faqType: typeof propertyData.faq,
      hasAiInstructions: !!propertyData.ai_instructions
    };
    console.log('Appartement récupéré:', propertyInfo);

    // Test 2: Récupérer les messages si conversationId est fourni
    let messagesInfo = null;
    if (conversationId) {
      console.log(`Test 2: Récupération des messages pour la conversation ID: ${conversationId}`);
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Erreur lors de la récupération des messages:', {
          code: messagesError.code,
          message: messagesError.message,
          details: messagesError.details,
          hint: messagesError.hint
        });
        
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Erreur lors de la récupération des messages',
            details: messagesError
          })
        };
      }

      if (!messagesData || messagesData.length === 0) {
        console.warn(`Aucun message trouvé pour la conversation ${conversationId}`);
        messagesInfo = { count: 0, messages: [] };
      } else {
        console.log(`${messagesData.length} messages récupérés pour la conversation ${conversationId}`);
        messagesInfo = {
          count: messagesData.length,
          firstMessage: messagesData[0],
          lastMessage: messagesData[messagesData.length - 1]
        };
      }
    }

    // Tester le parsing des données JSON
    console.log('Test de parsing des données JSON...');
    const safeParseJson = (data: any) => {
      if (!data) {
        console.log('Donnée JSON manquante (null ou undefined)');
        return { success: false, error: 'Données nulles' };
      }
      try {
        const result = typeof data === 'string' ? JSON.parse(data) : data;
        return { success: true, type: typeof result, keys: Object.keys(result) };
      } catch (error) {
        console.warn('Erreur lors du parsing JSON:', error.message);
        return { success: false, error: error.message, value: data };
      }
    };

    const parsingResults = {
      amenities: safeParseJson(propertyData.amenities),
      rules: safeParseJson(propertyData.rules),
      faq: safeParseJson(propertyData.faq)
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        property: propertyInfo,
        messages: messagesInfo,
        parsingResults: parsingResults
      })
    };
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
