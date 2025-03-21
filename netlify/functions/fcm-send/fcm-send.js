// Fonction Netlify pour envoyer des notifications FCM
// Cette fonction sert de proxy pour éviter les erreurs CORS lors de l'appel à l'API FCM

const fetch = require('node-fetch');

// URL FCM pour l'envoi direct des notifications
const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

exports.handler = async (event, context) => {
  // Vérifier la méthode HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  try {
    // Récupérer les données de la requête
    const payload = JSON.parse(event.body);
    const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

    // Vérification de la clé serveur FCM
    if (!FCM_SERVER_KEY) {
      console.error('FCM_SERVER_KEY non configurée');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'FCM_SERVER_KEY non configurée' })
      };
    }

    // Valider la présence du token FCM
    if (!payload.to) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Token FCM manquant' })
      };
    }

    console.log('Envoi de notification FCM à:', payload.to);

    // Envoi de la notification à FCM
    const fcmResponse = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!fcmResponse.ok) {
      const fcmError = await fcmResponse.text();
      console.error('Erreur FCM:', fcmError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Erreur lors de l\'envoi de la notification FCM',
          details: fcmError
        })
      };
    }

    const fcmResult = await fcmResponse.json();
    console.log('Réponse FCM:', fcmResult);

    return {
      statusCode: 200,
      body: JSON.stringify(fcmResult)
    };
  } catch (error) {
    console.error('Erreur:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
