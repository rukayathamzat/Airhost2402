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
      
      // Récupérer la session pour obtenir le token JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("Erreur: Aucune session disponible pour récupérer la configuration WhatsApp");
        return null;
      }
      
      // Utiliser fetch directement avec des en-têtes explicites
      // Récupérer l'URL Supabase depuis les variables d'environnement ou utiliser celle de recette
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pnbfsiicxhckptlgtjoj.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log("Utilisation de l'URL Supabase pour la requête WhatsApp:", supabaseUrl);
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_config?select=*&order=created_at.desc&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );
      
      if (!response.ok) {
        console.error(`Erreur HTTP: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.log("Configuration WhatsApp récupérée avec succès:", data);
      
      // Si nous avons un tableau avec au moins un élément, retourner le premier
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      
      // Si c'est déjà un objet unique, le retourner directement
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data;
      }
      
      console.log("Aucune configuration WhatsApp trouvée dans la réponse");
      return null;
    } catch (err) {
      console.error("Exception lors de la récupération de la configuration WhatsApp:", err);
      console.log("Aucune configuration WhatsApp trouvée, utilisation des valeurs par défaut");
      return null;
    }
  }

  static async saveConfig(config: Partial<WhatsAppConfig>) {
    try {
      console.log("Tentative de sauvegarde de la configuration WhatsApp:", config);
      
      // Récupérer la session pour obtenir le token JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("Erreur: Aucune session disponible pour sauvegarder la configuration WhatsApp");
        throw new Error("Non authentifié");
      }
      
      // Préparer les données avec updated_at
      const dataToSave = {
        ...config,
        updated_at: new Date().toISOString()
      };
      
      // Utiliser fetch directement avec des en-têtes explicites
      // Récupérer l'URL Supabase depuis les variables d'environnement ou utiliser celle de recette
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pnbfsiicxhckptlgtjoj.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log("Utilisation de l'URL Supabase pour la sauvegarde WhatsApp:", supabaseUrl);
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_config`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Prefer': 'return=minimal',
            'X-Upsert': 'true' // Pour faire un upsert
          },
          body: JSON.stringify(dataToSave)
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur HTTP: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Erreur lors de la sauvegarde: ${response.status} ${response.statusText}`);
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
