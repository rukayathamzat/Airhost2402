const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  console.log('Cleanup WhatsApp config function invoked');
  
  // Créer le client Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('Supabase URL:', supabaseUrl);
  console.log('Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('Using anon key:', !!process.env.VITE_SUPABASE_ANON_KEY);
  
  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase credentials' })
    };
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Récupérer toutes les configurations WhatsApp
    const { data: allConfigs, error: fetchError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération des configurations: ${fetchError.message}`);
    }

    console.log(`Trouvé ${allConfigs.length} configurations WhatsApp`);
    
    // Identifier la configuration avec le bon phone_number_id
    const correctConfig = allConfigs.find(config => config.phone_number_id === '477925252079395');
    const incorrectConfigs = allConfigs.filter(config => config.phone_number_id !== '477925252079395');
    
    if (!correctConfig) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Configuration correcte non trouvée' })
      };
    }
    
    console.log('Configuration correcte:', {
      id: correctConfig.id,
      phone_number_id: correctConfig.phone_number_id,
      tokenLength: correctConfig.token.length
    });
    
    // Supprimer les configurations incorrectes
    if (incorrectConfigs.length > 0) {
      const incorrectIds = incorrectConfigs.map(config => config.id);
      console.log(`Suppression de ${incorrectIds.length} configurations incorrectes:`, incorrectIds);
      
      const { error: deleteError } = await supabase
        .from('whatsapp_config')
        .delete()
        .in('id', incorrectIds);
        
      if (deleteError) {
        throw new Error(`Erreur lors de la suppression des configurations: ${deleteError.message}`);
      }
      
      console.log('Configurations incorrectes supprimées avec succès');
    } else {
      console.log('Aucune configuration incorrecte à supprimer');
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `${incorrectConfigs.length} configurations incorrectes supprimées`,
        remainingConfig: {
          id: correctConfig.id,
          phone_number_id: correctConfig.phone_number_id
        }
      })
    };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack
      })
    };
  }
};
