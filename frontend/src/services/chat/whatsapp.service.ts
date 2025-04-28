import { supabase } from '../../lib/supabase';

// Définition des types
export interface WhatsAppConfig {
  id?: string;
  user_id: string;
  property_id: string;
  phone_number: string;
  phone_number_id?: string;
  token?: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Service de gestion des intégrations WhatsApp
 */
export class WhatsAppService {
  /**
   * Récupère la configuration WhatsApp globale de l'utilisateur
   */
  static async getConfig(): Promise<WhatsAppConfig | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Utilisateur non authentifié');
      return null;
    }
    
    const { data, error } = await supabase
      .from('whatsapp_global_configs')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.error('Erreur lors de la récupération de la configuration WhatsApp globale:', error);
      return null;
    }
    
    return data || null;
  }
  
  /**
   * Enregistre la configuration WhatsApp globale de l'utilisateur
   */
  static async saveConfig(config: any): Promise<WhatsAppConfig | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Utilisateur non authentifié');
      return null;
    }
    
    // S'assurer que l'utilisateur est le propriétaire
    config.user_id = user.id;
    
    // Ajouter les timestamps
    const now = new Date().toISOString();
    config.updated_at = now;
    
    if (config.id) {
      // Mise à jour
      const { data, error } = await supabase
        .from('whatsapp_global_configs')
        .update({
          phone_number: config.phone_number,
          phone_number_id: config.phone_number_id,
          token: config.token,
          enabled: config.enabled,
          updated_at: now
        })
        .eq('id', config.id)
        .select()
        .single();
        
      if (error) {
        console.error('Erreur lors de la mise à jour de la configuration WhatsApp globale:', error);
        return null;
      }
      
      return data;
    } else {
      // Création
      config.created_at = now;
      
      const { data, error } = await supabase
        .from('whatsapp_global_configs')
        .insert({
          user_id: config.user_id,
          phone_number: config.phone_number,
          phone_number_id: config.phone_number_id,
          token: config.token,
          enabled: config.enabled,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
        
      if (error) {
        console.error('Erreur lors de la création de la configuration WhatsApp globale:', error);
        return null;
      }
      
      return data;
    }
  }
  
  /**
   * Envoie un message WhatsApp
   */
  static async sendMessage(contactId: string, content: string): Promise<boolean> {
    try {
      console.log(`[WhatsApp] Envoi de message à ${contactId}: ${content}`);
      
      // Dans une implémentation réelle, cela appellerait une fonction Edge
      // qui enverrait le message via l'API WhatsApp
      
      // Simuler un succès
      return true;
    } catch (error) {
      console.error('[WhatsApp] Erreur lors de l\'envoi du message:', error);
      return false;
    }
  }
  /**
   * Récupère la configuration WhatsApp pour une propriété
   */
  static async getWhatsAppConfig(propertyId: string): Promise<WhatsAppConfig | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Utilisateur non authentifié');
      return null;
    }
    
    const { data, error } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.error('Erreur lors de la récupération de la configuration WhatsApp:', error);
      return null;
    }
    
    return data || null;
  }
  
  /**
   * Crée ou met à jour la configuration WhatsApp pour une propriété
   */
  static async saveWhatsAppConfig(config: WhatsAppConfig): Promise<WhatsAppConfig | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Utilisateur non authentifié');
      return null;
    }
    
    // S'assurer que l'utilisateur est le propriétaire
    config.user_id = user.id;
    
    // Ajouter les timestamps
    const now = new Date().toISOString();
    config.updated_at = now;
    
    if (config.id) {
      // Mise à jour
      const { data, error } = await supabase
        .from('whatsapp_configs')
        .update({
          phone_number: config.phone_number,
          enabled: config.enabled,
          updated_at: now
        })
        .eq('id', config.id)
        .select()
        .single();
        
      if (error) {
        console.error('Erreur lors de la mise à jour de la configuration WhatsApp:', error);
        return null;
      }
      
      return data;
    } else {
      // Création
      config.created_at = now;
      
      const { data, error } = await supabase
        .from('whatsapp_configs')
        .insert({
          user_id: config.user_id,
          property_id: config.property_id,
          phone_number: config.phone_number,
          enabled: config.enabled,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
        
      if (error) {
        console.error('Erreur lors de la création de la configuration WhatsApp:', error);
        return null;
      }
      
      return data;
    }
  }
  
  /**
   * Active ou désactive l'intégration WhatsApp pour une propriété
   */
  static async toggleWhatsAppIntegration(propertyId: string, enabled: boolean): Promise<boolean> {
    const config = await this.getWhatsAppConfig(propertyId);
    
    if (!config) {
      console.error('Configuration WhatsApp introuvable');
      return false;
    }
    
    const result = await this.saveWhatsAppConfig({
      ...config,
      enabled
    });
    
    return !!result;
  }
}
