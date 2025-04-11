export interface MessageAnalysisResult {
  canRespond: boolean;
  isUrgent: boolean;
  isUnhappy: boolean;
  explanation: string;
}

export class MessageAnalysisService {
  static async analyzeMessage(
    messageContent: string,
    messageId?: string,
    conversationId?: string,
    apartmentId?: string
  ): Promise<MessageAnalysisResult> {
    console.log('Début de analyzeMessage avec:', { 
      messageId: messageId || 'non fourni', 
      conversationId: conversationId || 'non fourni',
      contentLength: messageContent.length
    });
    
    try {
      console.log('Envoi de la requête à la fonction Netlify...');
      const response = await fetch('/.netlify/functions/analyze-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          messageContent,
          conversationId,
          apartmentId
        })
      });

      console.log('Réponse reçue, status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur serveur:', errorData);
        throw new Error(errorData.error || 'Erreur lors de l\'analyse du message');
      }

      const data = await response.json();
      console.log('Données d\'analyse reçues:', data);
      
      // Vérification du format de la réponse
      if (!data || typeof data !== 'object') {
        console.error('Format de réponse invalide:', data);
        throw new Error('Format de réponse invalide');
      }
      
      return {
        canRespond: !!data.canRespond,
        isUrgent: !!data.isUrgent,
        isUnhappy: !!data.isUnhappy,
        explanation: data.explanation || 'Aucune explication fournie'
      };
    } catch (error) {
      console.error('Erreur lors de l\'analyse du message:', error);
      // Retourner un résultat par défaut en cas d'erreur
      return {
        canRespond: false,
        isUrgent: false,
        isUnhappy: false,
        explanation: `Erreur d'analyse: ${error instanceof Error ? error.message : 'erreur inconnue'}`
      };
    }
  }
}
