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
      console.log("[WhatsAppService] v1.0.2 - Tentative de récupération de la configuration WhatsApp via RPC...");
      
      // Utiliser la fonction RPC de Supabase pour contourner les problèmes d'API REST
      const { data, error } = await supabase.rpc('get_whatsapp_config');
      
      if (error) {
        console.error("Erreur lors de l'appel RPC:", error);
        return null;
      }
      
      console.log("Configuration WhatsApp récupérée via RPC avec succès:", data);
      
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
      console.log("[WhatsAppService] v1.0.2 - Tentative de sauvegarde de la configuration WhatsApp via API standard:", config);
      
      // Préparer les données avec updated_at
      const dataToSave = {
        ...config,
        updated_at: new Date().toISOString()
      };
      
      // Utiliser l'API standard de Supabase pour l'insertion/mise à jour
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert(dataToSave);
      
      if (error) {
        console.error("Erreur lors de la sauvegarde via Supabase:", error);
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
