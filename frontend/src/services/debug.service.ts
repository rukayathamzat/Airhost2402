export class DebugService {
  static async checkEnvironment() {
    try {
      console.log('Envoi de la requête de débogage...');
      const response = await fetch('/.netlify/functions/debug-env', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Réponse reçue, status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur serveur:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la vérification de l\'environnement');
      }

      const data = await response.json();
      console.log('Informations de débogage:', data);
      return data;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'environnement:', error);
      throw error;
    }
  }
}
