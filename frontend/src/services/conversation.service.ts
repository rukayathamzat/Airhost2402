import { supabase } from '../lib/supabase';
import { Conversation } from '../types/conversation';

export class ConversationService {
  static async createConversation(params: {
    host_id: string;
    guest_name: string;
    guest_phone: string;
    property_id: string;
    check_in_date: string;
    check_out_date: string;
  }): Promise<{ conversation: Conversation; isNew: boolean }> {
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('host_id', params.host_id)
        .eq('property_id', params.property_id)
        .eq('guest_phone', params.guest_phone)
        .single();

      if (existing) {
        return { conversation: existing, isNew: false };
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert([params])
        .select()
        .single();

      if (error) throw error;
      return { conversation: data, isNew: true };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }
} 