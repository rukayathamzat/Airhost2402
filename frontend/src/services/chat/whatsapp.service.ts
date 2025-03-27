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
      console.log("Tentative de récupération de la configuration WhatsApp...");
      
      // Ajout d'en-têtes explicites pour éviter les problèmes de format
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Erreur lors de la récupération de la configuration WhatsApp:", error);
        // Ne pas lancer d'erreur, retourner null pour utiliser les valeurs par défaut
        return null;
      }
      
      console.log("Configuration WhatsApp récupérée avec succès:", data);
      return data;
    } catch (err) {
      console.error("Exception lors de la récupération de la configuration WhatsApp:", err);
      // Utiliser des valeurs par défaut en cas d'erreur
      console.log("Aucune configuration WhatsApp trouvée, utilisation des valeurs par défaut");
      return null;
    }
  }

  static async saveConfig(config: Partial<WhatsAppConfig>) {
    try {
      console.log("Tentative de sauvegarde de la configuration WhatsApp:", config);
      
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert({
          ...config,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("Erreur lors de la sauvegarde de la configuration WhatsApp:", error);
        throw error;
      }
      
      console.log("Configuration WhatsApp sauvegardée avec succès");
    } catch (err) {
      console.error("Exception lors de la sauvegarde de la configuration WhatsApp:", err);
      throw err;
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
