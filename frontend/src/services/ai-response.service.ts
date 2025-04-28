// Fonction de mock pour générer des réponses IA en développement local
const isDevelopment = import.meta.env.DEV;
const mockResponses = [
  "Bonjour! Je suis ravi de vous accueillir dans notre appartement. N'hésitez pas à me poser des questions sur les équipements, les attractions locales ou tout ce dont vous pourriez avoir besoin pendant votre séjour.",
  "Bienvenue! Pour accéder à l'appartement, utilisez le code 1234 sur le digicode de l'entrée principale. Le Wi-Fi est disponible avec le nom 'AirHost-Guest' et le mot de passe 'welcome2023'. Bon séjour!",
  "Il y a plusieurs restaurants recommandés à proximité : 'Le Bistrot Parisien' à 5 minutes à pied, 'La Trattoria' à 10 minutes, et 'Le Jardin Secret' qui propose une excellente cuisine locale. Tous sont accessibles à pied depuis l'appartement.",
  "Pour vous rendre au centre-ville, vous pouvez prendre le bus n° 42 qui passe juste devant l'immeuble toutes les 15 minutes. Le trajet dure environ 20 minutes. Vous pouvez également utiliser le métro, la station la plus proche est à 10 minutes à pied.",
  "Le check-out est prévu à 11h. Vous pouvez laisser les clés sur la table de la cuisine en partant. N'oubliez pas de fermer toutes les fenêtres et d'éteindre les lumières. Merci pour votre séjour!"
];

async function generateMockResponse(): Promise<string> {
  // Simuler un délai réaliste pour l'appel API
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Sélectionner une réponse aléatoire
  const randomIndex = Math.floor(Math.random() * mockResponses.length);
  return mockResponses[randomIndex];
}

export class AIResponseService {
  static async generateResponse(apartmentId: string, conversationId: string) {
    console.log('Début de generateResponse avec:', { apartmentId, conversationId });
    
    // En développement, utiliser le mock local
    if (isDevelopment) {
      console.log('Mode développement détecté, utilisation du mock local...');
      try {
        const mockResponse = await generateMockResponse();
        console.log('Réponse mock générée:', mockResponse);
        return mockResponse;
      } catch (mockError) {
        console.error('Erreur avec le mock local:', mockError);
        throw new Error('Erreur lors de la génération de la réponse mock');
      }
    }
    
    // En production, utiliser les fonctions réelles
    try {
      // Essayer d'abord la fonction Edge Supabase
      console.log('Envoi de la requête à la fonction Edge Supabase...');
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/generate-ai-response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pas besoin d'authentification car la fonction est publique
          },
          body: JSON.stringify({
            apartmentId,
            conversationId
          })
        });
        
        if (edgeResponse.ok) {
          console.log('Réponse Edge Supabase reçue, status:', edgeResponse.status);
          const data = await edgeResponse.json();
          console.log('Données brutes reçues de l\'API Edge:', data);
          
          if (data.response) {
            console.log('Réponse IA extraite et validée (Edge):', data.response);
            return data.response;
          }
        }
        
        console.log('La fonction Edge a échoué ou renvoyé un format invalide, fallback sur Netlify...');
      } catch (edgeError) {
        console.error('Erreur avec la fonction Edge, fallback sur Netlify:', edgeError);
      }
      
      // Fallback sur la fonction Netlify
      console.log('Envoi de la requête à la fonction Netlify...');
      const response = await fetch('/.netlify/functions/generate-ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apartmentId,
          conversationId
        })
      });

      console.log('Réponse reçue, status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur serveur:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la génération de la réponse');
      }

      const data = await response.json();
      console.log('Données brutes reçues de l\'API:', data);
      
      // Vérification du format de la réponse
      if (!data.response) {
        console.error('Format de réponse invalide:', data);
        throw new Error('Format de réponse invalide');
      }
      
      // Vérification supplémentaire pour éviter les réponses de type "Template envoyé"
      if (data.response.startsWith('Template envoyé:')) {
        console.error('Réponse invalide (template):', data.response);
        throw new Error('Erreur: La réponse semble être un template, pas une réponse IA');
      }
      
      console.log('Réponse IA extraite et validée:', data.response);
      return data.response;
    } catch (error) {
      console.error('Erreur lors de la génération de la réponse:', error);
      throw error;
    }
  }
}