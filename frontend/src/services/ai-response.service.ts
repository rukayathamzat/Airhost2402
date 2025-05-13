export class AIResponseService {
  static async generateResponse(apartmentId: string, conversationId: string) {
    console.log('Début de generateResponse avec:', { apartmentId, conversationId });
    try {
      if (!apartmentId || !conversationId) {
        throw new Error('apartmentId et conversationId sont requis');
      }

      // For development, return mock responses
      if (import.meta.env.DEV) {
        console.log('Mode développement: utilisation de réponses simulées');
        return [
          "Je peux vous aider avec ça! Voici quelques suggestions...",
          "Bien sûr, je comprends votre demande. Voici ce que je propose...",
          "Je vais vous assister avec cela. Voici mes recommandations..."
        ];
      }

      const endpoint = '/.netlify/functions/generate-ai-response';
      console.log('Envoi de la requête à:', endpoint);
      const response = await fetch(endpoint, {
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
      
      const responseText = await response.text();
      console.log('Réponse brute:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          console.error('Erreur de parsing JSON pour l\'erreur:', e);
          errorData = { error: responseText || 'Erreur lors de la génération de la réponse' };
        }
        console.error('Erreur serveur:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la génération de la réponse');
      }

      if (!responseText) {
        throw new Error('Réponse vide du serveur');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Erreur de parsing JSON:', e);
        throw new Error('Format de réponse invalide');
      }

      console.log('Données brutes reçues de l\'API:', data);
      
      // Vérification du format de la réponse
      if (!data.response) {
        console.error('Format de réponse invalide:', data);
        throw new Error('Format de réponse invalide');
      }
      
      // Vérification supplémentaire pour éviter les réponses de type "Template envoyé"
      if (typeof data.response === 'string' && data.response.startsWith('Template envoyé:')) {
        console.error('Réponse invalide (template):', data.response);
        throw new Error('Erreur: La réponse semble être un template, pas une réponse IA');
      }
      
      // Ensure we return an array of strings
      const suggestions = Array.isArray(data.response) ? data.response : [data.response];
      console.log('Réponse IA extraite et validée:', suggestions);
      return suggestions;
    } catch (error: any) {
      console.error('Erreur détaillée lors de la génération de la réponse:', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        name: error?.name
      });
      throw error;
    }
  }
}