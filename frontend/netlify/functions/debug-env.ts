import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  try {
    // Vérifier les variables d'environnement (masquer les valeurs sensibles)
    const envVars = {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'Défini' : 'Non défini',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Défini' : 'Non défini',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Défini' : 'Non défini',
      OPENAI_ORG_ID: process.env.OPENAI_ORG_ID ? 'Défini' : 'Non défini',
      NODE_VERSION: process.env.NODE_VERSION || 'Non défini',
      // Ajouter d'autres variables d'environnement si nécessaire
    };

    // Vérifier les informations de la requête
    const requestInfo = {
      httpMethod: event.httpMethod,
      path: event.path,
      headers: event.headers,
      queryStringParameters: event.queryStringParameters,
      body: event.body ? 'Présent' : 'Non présent'
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Informations de débogage',
        environment: process.env.NODE_ENV || 'Non défini',
        envVars,
        requestInfo,
        functionRuntime: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      }, null, 2)
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Erreur interne du serveur' })
    };
  }
};
