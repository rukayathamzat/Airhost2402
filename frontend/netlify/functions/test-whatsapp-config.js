const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  console.log('Test WhatsApp config function invoked');
  
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'GET') {
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
    // 1. Vérifier que la table whatsapp_config existe
    const { data: tableExists, error: tableError } = await supabase
      .rpc('check_table_exists', { table_name: 'whatsapp_config' });
    
    if (tableError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Erreur lors de la vérification de la table',
          details: tableError.message
        })
      };
    }
    
    if (!tableExists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'La table whatsapp_config n\'existe pas' })
      };
    }
    
    // 2. Récupérer la configuration WhatsApp la plus récente
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (configError) {
      if (configError.code === 'PGRST116') {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Aucune configuration WhatsApp trouvée' })
        };
      }
      
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Erreur lors de la récupération de la configuration',
          details: configError.message
        })
      };
    }
    
    // Masquer le token complet pour des raisons de sécurité
    const tokenMasked = whatsappConfig.token 
      ? `${whatsappConfig.token.substring(0, 4)}...${whatsappConfig.token.substring(whatsappConfig.token.length - 4)}`
      : null;
    
    // 3. Tester la connexion à l'API WhatsApp (validation du token)
    let whatsappApiStatus = { success: false, message: 'Non testé' };
    
    if (whatsappConfig.phone_number_id && whatsappConfig.token) {
      try {
        // Effectuer une requête simple à l'API WhatsApp pour vérifier le token
        const response = await fetch(
          `https://graph.facebook.com/v22.0/${whatsappConfig.phone_number_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${whatsappConfig.token}`
            }
          }
        );
        
        const data = await response.json();
        
        if (response.ok) {
          whatsappApiStatus = { 
            success: true, 
            message: 'Connexion à l\'API WhatsApp réussie',
            data: {
              name: data.display_phone_number || data.name,
              status: data.status || 'unknown'
            }
          };
        } else {
          whatsappApiStatus = { 
            success: false, 
            message: 'Échec de connexion à l\'API WhatsApp',
            error: data.error?.message || 'Erreur inconnue',
            errorCode: data.error?.code
          };
        }
      } catch (apiError) {
        whatsappApiStatus = { 
          success: false, 
          message: 'Exception lors de la connexion à l\'API WhatsApp',
          error: apiError.message
        };
      }
    }
    
    // 4. Vérifier les derniers messages envoyés/reçus
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        direction,
        status,
        type,
        created_at,
        metadata
      `)
      .eq('type', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(5);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        whatsappConfig: {
          id: whatsappConfig.id,
          phone_number_id: whatsappConfig.phone_number_id,
          token: tokenMasked,
          created_at: whatsappConfig.created_at,
          updated_at: whatsappConfig.updated_at
        },
        whatsappApiStatus,
        recentMessages: recentMessages || [],
        messagesError: messagesError ? messagesError.message : null
      })
    };
  } catch (error) {
    console.error('Erreur non gérée:', error);
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
