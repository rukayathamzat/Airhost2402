// Fonction Netlify pour envoyer des notifications FCM
// Cette fonction sert de proxy pour éviter les erreurs CORS lors de l'appel à l'API FCM
// Version sécurisée (Mars 2025)

const admin = require('firebase-admin');

exports.handler = async (event, context) => {
  // Autoriser uniquement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }
  
  // Initialiser Firebase Admin SDK si ce n'est pas déjà fait
  if (!admin.apps.length) {
    try {
      // Récupérer les variables d'environnement
      const projectId = process.env.FCM_PROJECT_ID;
      const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FCM_CLIENT_EMAIL;
      
      // Vérifier que les variables nécessaires sont définies
      if (!projectId || !privateKey || !clientEmail) {
        throw new Error('Variables d\'environnement FCM manquantes');
      }
      
      // Initialiser l'app Firebase
      console.log("Initialisation de Firebase Admin SDK...");
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail
        })
      });
      
      console.log("Firebase Admin SDK initialisé avec succès");
    } catch (error) {
      console.error("Erreur lors de l'initialisation de Firebase Admin:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Erreur de configuration Firebase' })
      };
    }
  }
  
  try {
    // Parser le corps de la requête
    const payload = JSON.parse(event.body);
    
    if (!payload.to) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Token de destination manquant' })
      };
    }
    
    // Préparer le message à envoyer
    const message = {
      token: payload.to,
      notification: payload.notification || {},
      data: payload.data || {}
    };
    
    // Envoyer le message via Firebase Admin SDK
    console.log("Envoi du message FCM:", JSON.stringify(message));
    const response = await admin.messaging().send(message);
    console.log("Message FCM envoyé avec succès:", response);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, messageId: response })
    };
  } catch (error) {
    console.error("Erreur lors de l'envoi du message FCM:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur lors de l\'envoi du message' })
    };
  }
};
