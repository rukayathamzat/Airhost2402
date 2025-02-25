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
      console.log('Données reçues:', data);
      return data.response;
    } catch (error) {
      console.error('Erreur lors de la génération de la réponse:', error);
      throw error;
    }
  }
}
