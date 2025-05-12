import { supabase } from '../../lib/supabase';
import { Conversation } from '../../types/conversation';

interface CreateConversationParams {
  host_id: string;
  guest_name: string;
  guest_phone: string;
  property_id: string;
  check_in_date: string;
  check_out_date: string;
  status?: string;
}

class ConversationService {
  /**
   * Crée une nouvelle conversation via l'Edge Function Supabase
   */
  async createConversation(params: CreateConversationParams): Promise<{ conversation: Conversation; isNew: boolean }> {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Erreur de session: ${sessionError.message}`);
      if (!sessionData.session) throw new Error('Utilisateur non authentifié');

      const { data, error } = await supabase.functions.invoke('create-conversation', {
        body: params,
      });

      if (error) throw new Error(`Erreur lors de la création de la conversation: ${error.message}`);
      
      // Détermine si c'est une nouvelle conversation ou une existante
      const isNew = data.message === 'Conversation créée avec succès';
      
      return { 
        conversation: data.conversation,
        isNew
      };
    } catch (error) {
      console.error('Erreur dans createConversation:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les conversations d'un utilisateur
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Erreur de session: ${sessionError.message}`);
      if (!sessionData.session) throw new Error('Utilisateur non authentifié');

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          guest_name,
          guest_phone,
          property:properties!inner(name, host_id, id),
          check_in_date,
          check_out_date,
          status,
          last_message,
          last_message_at,
          unread_count
        `)
        .eq('property.host_id', sessionData.session.user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Transformer les données
      return data?.map(item => ({
        ...item,
        property: Array.isArray(item.property) ? item.property : [item.property]
      })) || [];
    } catch (error) {
      console.error('Erreur dans getConversations:', error);
      throw error;
    }
  }

  /**
   * Récupère une conversation par son ID
   */
  async getConversationById(conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          guest_name,
          guest_phone,
          property:properties!inner(name, host_id, id),
          check_in_date,
          check_out_date,
          status,
          last_message,
          last_message_at,
          unread_count
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Aucune conversation trouvée
        }
        throw error;
      }

      // Transformer les données
      return {
        ...data,
        property: Array.isArray(data.property) ? data.property : [data.property]
      };
    } catch (error) {
      console.error('Erreur dans getConversationById:', error);
      throw error;
    }
  }
}

export const conversationService = new ConversationService();
