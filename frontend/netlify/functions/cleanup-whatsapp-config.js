const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  console.log('Cleanup WhatsApp config function invoked');
  
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  // Créer le client Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('Supabase URL:', supabaseUrl);
  console.log('Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('Using anon key:', !!process.env.VITE_SUPABASE_ANON_KEY);
  
  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase credentials' })
    };
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Récupérer le phone_number_id à conserver (soit de la requête, soit une valeur par défaut)
    let correctPhoneNumberId = '477925252079395';
    
    if (event.httpMethod === 'POST' && event.body) {
      try {
        const body = JSON.parse(event.body);
        if (body.phone_number_id) {
          correctPhoneNumberId = body.phone_number_id;
          console.log(`Phone number ID fourni dans la requête: ${correctPhoneNumberId}`);
        }
      } catch (e) {
        console.error('Erreur lors du parsing du body:', e.message);
      }
    } else if (event.queryStringParameters && event.queryStringParameters.phone_number_id) {
      correctPhoneNumberId = event.queryStringParameters.phone_number_id;
      console.log(`Phone number ID fourni dans les paramètres: ${correctPhoneNumberId}`);
    }
    
    // Récupérer toutes les configurations WhatsApp
    const { data: allConfigs, error: fetchError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Erreur lors de la récupération des configurations:', fetchError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Erreur lors de la récupération des configurations', 
          details: fetchError.message 
        })
      };
    }

    if (!allConfigs || allConfigs.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Aucune configuration WhatsApp trouvée' })
      };
    }

    console.log(`Trouvé ${allConfigs.length} configurations WhatsApp`);
    
    // Identifier la configuration avec le bon phone_number_id
    const correctConfig = allConfigs.find(config => config.phone_number_id === correctPhoneNumberId);
    const incorrectConfigs = allConfigs.filter(config => config.phone_number_id !== correctPhoneNumberId);
    
    if (!correctConfig) {
      console.log(`Aucune configuration trouvée avec phone_number_id: ${correctPhoneNumberId}`);
      
      // Si aucune configuration ne correspond au phone_number_id demandé
      // mais qu'il existe d'autres configurations, utiliser la plus récente
      if (allConfigs && allConfigs.length > 0) {
        const mostRecentConfig = allConfigs[0]; // Déjà triée par date décroissante
        console.log(`Utilisation de la configuration la plus récente:`, {
          id: mostRecentConfig.id,
          phone_number_id: mostRecentConfig.phone_number_id,
          created_at: mostRecentConfig.created_at
        });
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: `Configuration avec phone_number_id ${correctPhoneNumberId} non trouvée, mais autre configuration gardée`,
            keptConfig: {
              id: mostRecentConfig.id,
              phone_number_id: mostRecentConfig.phone_number_id,
              created_at: mostRecentConfig.created_at
            },
            removedCount: 0
          })
        };
      }
      
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Aucune configuration WhatsApp valide trouvée' })
      };
    }
    
    // Masquer le token pour des raisons de sécurité
    const tokenMasked = correctConfig.token 
      ? `${correctConfig.token.substring(0, 4)}...${correctConfig.token.substring(correctConfig.token.length - 4)}`
      : null;
      
    console.log('Configuration correcte:', {
      id: correctConfig.id,
      phone_number_id: correctConfig.phone_number_id,
      tokenMasked: tokenMasked,
      created_at: correctConfig.created_at
    });
    
    // Supprimer les configurations incorrectes
    let deleteStatus = { success: true, message: 'Aucune configuration incorrecte à supprimer' };
    
    if (incorrectConfigs.length > 0) {
      const incorrectIds = incorrectConfigs.map(config => config.id);
      console.log(`Suppression de ${incorrectIds.length} configurations incorrectes`);      
      
      const { error: deleteError } = await supabase
        .from('whatsapp_config')
        .delete()
        .in('id', incorrectIds);
        
      if (deleteError) {
        console.error('Erreur lors de la suppression des configurations:', deleteError);
        deleteStatus = { 
          success: false, 
          message: `Erreur lors de la suppression: ${deleteError.message}`,
          error: deleteError
        };
      } else {
        console.log('Configurations incorrectes supprimées avec succès');
        deleteStatus = { 
          success: true, 
          message: `${incorrectConfigs.length} configurations supprimées avec succès` 
        };
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        message: `Nettoyage terminé. ${deleteStatus.message}`,
        deleteStatus: deleteStatus,
        remainingConfig: {
          id: correctConfig.id,
          phone_number_id: correctConfig.phone_number_id,
          token: tokenMasked,
          created_at: correctConfig.created_at,
          updated_at: correctConfig.updated_at
        },
        totalConfigsFound: allConfigs.length,
        configsRemoved: incorrectConfigs.length
      })
    };
  } catch (error) {
    console.error('Exception non gérée:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Erreur interne du serveur',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
