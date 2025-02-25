import { supabase } from '../../lib/supabase';

export interface Message {
  id: string;
  content: string;
  created_at: string;
  direction: 'inbound' | 'outbound';
  type?: 'text' | 'template';
  status?: 'sent' | 'delivered' | 'read';
}

export class MessageService {
  static async sendMessage(conversationId: string, content: string, type: 'text' | 'template' = 'text') {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content,
        direction: 'outbound',
        type,
        status: 'sent'
      });

    if (error) throw error;
  }

  static async getMessages(conversationId: string, limit = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data as Message[];
  }

  static subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        callback(payload.new as Message);
      })
      .subscribe();
  }
}
