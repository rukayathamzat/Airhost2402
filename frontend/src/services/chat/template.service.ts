import { supabase } from '../../lib/supabase';

// Définition des types
export interface Template {
  id: string;
  name: string;
  content: string;
  description?: string;
  user_id: string;
  property_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateParams {
  name: string;
  content: string;
  property_id?: string;
}

/**
 * Service de gestion des templates de message
 */
export class TemplateService {
  /**
   * Récupère les templates d'un utilisateur
   */
  static async getTemplates(propertyId?: string): Promise<Template[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Utilisateur non authentifié');
      return [];
    }
    
    let query = supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id);
      
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    
    if (error) {
      console.error('Erreur lors de la récupération des templates:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Crée un nouveau template
   */
  static async createTemplate(params: CreateTemplateParams): Promise<Template | null> {
    const { name, content, property_id } = params;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Utilisateur non authentifié');
      return null;
    }
    
    const template = {
      name,
      content,
      user_id: user.id,
      property_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('templates')
      .insert(template)
      .select()
      .single();
      
    if (error) {
      console.error('Erreur lors de la création du template:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Met à jour un template existant
   */
  static async updateTemplate(id: string, params: Partial<CreateTemplateParams>): Promise<Template | null> {
    const { name, content, property_id } = params;
    
    const template = {
      ...(name && { name }),
      ...(content && { content }),
      ...(property_id && { property_id }),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('templates')
      .update(template)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Erreur lors de la mise à jour du template:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Supprime un template
   */
  static async deleteTemplate(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Erreur lors de la suppression du template:', error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Envoie un template comme message dans une conversation
   */
  static async sendTemplate(conversationId: string, whatsappContactId: string | null, template: Template): Promise<boolean> {
    try {
      console.log(`[Template] Envoi du template ${template.name} dans la conversation ${conversationId}`);
      
      // Importer le service de message
      const { MessageService } = await import('./message.service');
      
      // Envoyer le message avec le contenu du template
      const message = await MessageService.sendMessage({
        conversation_id: conversationId,
        content: template.content,
        sender_type: 'user',
        metadata: {
          template_id: template.id,
          template_name: template.name,
          message_type: 'template'
        }
      });
      
      // Si un contact WhatsApp est spécifié, envoyer également le message via WhatsApp
      if (whatsappContactId) {
        const { WhatsAppService } = await import('./whatsapp.service');
        await WhatsAppService.sendMessage(whatsappContactId, template.content);
      }
      
      return !!message;
    } catch (error) {
      console.error('[Template] Erreur lors de l\'envoi du template:', error);
      return false;
    }
  }
}
