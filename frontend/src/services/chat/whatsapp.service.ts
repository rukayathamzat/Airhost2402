import { supabase } from '../../lib/supabase';

export interface WhatsAppConfig {
  phone_number_id: string;
  token: string;
  created_at?: string;
  updated_at?: string;
}

export class WhatsAppService {
  static async getConfig(): Promise<WhatsAppConfig | null> {
    try {
      console.log("[WhatsAppService] v1.0.3 - Tentative de récupération de la configuration WhatsApp via Edge Function...");
      
      // Récupérer la session pour obtenir le token JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("Erreur: Aucune session disponible pour récupérer la configuration WhatsApp");
        return null;
      }
      
      // Utiliser l'Edge Function pour récupérer la configuration WhatsApp
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-config`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur HTTP: ${response.status} ${response.statusText}`, errorText);
        return null;
      }
      
      const { data, error } = await response.json();
      
      if (error) {
        console.error("Erreur lors de l'appel à l'Edge Function:", error);
        return null;
      }
      
      console.log("Configuration WhatsApp récupérée via Edge Function avec succès:", data);
      
      // La fonction RPC retourne directement un objet JSON, pas un tableau
      if (data && typeof data === 'object') {
        return data as WhatsAppConfig;
      }
      
      console.log("Aucune configuration WhatsApp trouvée dans la réponse");
      return null;
    } catch (err) {
      console.error("Exception lors de la récupération de la configuration WhatsApp:", err);
      console.log("Aucune configuration WhatsApp trouvée, utilisation des valeurs par défaut");
      return null;
    }
  }

  static async saveConfig(config: Partial<WhatsAppConfig>): Promise<boolean> {
    try {
      console.log("[WhatsAppService] v1.0.3 - Tentative de sauvegarde de la configuration WhatsApp via Edge Function:", config);
      
      // Récupérer la session pour obtenir le token JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("Erreur: Aucune session disponible pour sauvegarder la configuration WhatsApp");
        return false;
      }
      
      // Utiliser l'Edge Function pour sauvegarder la configuration WhatsApp
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config)
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur HTTP: ${response.status} ${response.statusText}`, errorText);
        return false;
      }
      
      const { error } = await response.json();
      
      if (error) {
        console.error("Erreur lors de l'appel à l'Edge Function:", error);
        return false;
      }
      
      console.log("Configuration WhatsApp sauvegardée avec succès");
      return true;
    } catch (err) {
      console.error("Exception lors de la sauvegarde de la configuration WhatsApp:", err);
      return false;
    }
  }

  static async sendMessage(to: string, content: string) {
    console.log('Tentative d\'envoi WhatsApp:', { to, content });
    
    try {
      // Récupérer la session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`/.netlify/functions/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ content, to })
      });

      if (!response.ok) {
        const result = await response.json();
        const errorMsg = result?.error || `Erreur ${response.status}: ${response.statusText}`;
        console.error('Erreur WhatsApp:', errorMsg);
        throw new Error(errorMsg);
      }
      
      const responseData = await response.json();
      console.log('Message WhatsApp envoyé avec succès:', responseData);
      return responseData;
    } catch (error) {
      console.error('Erreur lors de l\'envoi WhatsApp:', error);
      throw error;
    }
  }
}
