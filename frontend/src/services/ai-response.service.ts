export class AIResponseService {
  static async generateResponse(apartmentId: string, conversationId: string) {
    console.log('Début de generateResponse avec:', { apartmentId, conversationId });
    try {
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