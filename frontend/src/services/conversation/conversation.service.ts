import { supabase } from '../../lib/supabase';

// Définition des types
export interface Conversation {
  id: string;
  user_id: string;
  property_id: string;
  contact_id?: string;
  whatsapp_contact_id?: string;
  title?: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  metadata?: any;
}

export interface CreateConversationParams {
  property_id: string;
  contact_id?: string;
  whatsapp_contact_id?: string;
  title?: string;
  metadata?: any;
}

/**
 * Service de gestion des conversations
 */
export class ConversationService {
  /**
   * Crée une nouvelle conversation
   */
  static async createConversation(params: CreateConversationParams): Promise<{ conversation: Conversation; isNew: boolean }> {
    const { property_id, contact_id, whatsapp_contact_id, title, metadata } = params;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    
    // Vérifier si une conversation existe déjà
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('property_id', property_id);
      
    if (contact_id) {
      query = query.eq('contact_id', contact_id);
    }
    
    if (whatsapp_contact_id) {
      query = query.eq('whatsapp_contact_id', whatsapp_contact_id);
    }
    
    const { data: existingConversations, error: fetchError } = await query.order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('Erreur lors de la recherche de conversations existantes:', fetchError);
      throw fetchError;
    }
    
    // Si une conversation existe déjà, la retourner
    if (existingConversations && existingConversations.length > 0) {
      return {
        conversation: existingConversations[0],
        isNew: false
      };
    }
    
    // Sinon, créer une nouvelle conversation
    const now = new Date().toISOString();
    const conversation = {
      user_id: user.id,
      property_id,
      contact_id,
      whatsapp_contact_id,
      title: title || 'Nouvelle conversation',
      created_at: now,
      updated_at: now,
      last_message_at: now,
      metadata
    };
    
    const { data, error } = await supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single();
      
    if (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      throw error;
    }
    
    return {
      conversation: data,
      isNew: true
    };
  }
  
  /**
   * Récupère les conversations d'un utilisateur
   */
  static async getConversations(propertyId?: string): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Utilisateur non authentifié');
      return [];
    }
    
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id);
      
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    const { data, error } = await query.order('last_message_at', { ascending: false });
    
    if (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Récupère une conversation par son ID
   */
  static async getConversation(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
      
    if (error) {
      console.error('Erreur lors de la récupération de la conversation:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Met à jour une conversation
   */
  static async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();
      
    if (error) {
      console.error('Erreur lors de la mise à jour de la conversation:', error);
      return null;
    }
    
    return data;
  }
}

// Exporter une instance pour la compatibilité avec le code existant
export const conversationService = ConversationService;
