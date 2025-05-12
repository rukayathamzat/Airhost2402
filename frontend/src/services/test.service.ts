export class TestService {
  static async testAIResponse() {
    try {
      console.log('Envoi de la requête de test AI...');
      const response = await fetch('/.netlify/functions/test-ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      console.log('Réponse reçue, status:', response.status);
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Erreur serveur:', data);
        throw new Error(data.error || 'Erreur lors du test AI');
      }

      console.log('Résultat du test AI:', data);
      return data;
    } catch (error) {
      console.error('Erreur lors du test AI:', error);
      throw error;
    }
  }
}
