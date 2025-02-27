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
    console.log('Envoi du message:', { conversationId, content, type });
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          direction: 'outbound',
          type,
          status: 'sent'
        })
        .select();

      if (error) throw error;
      
      console.log('Message envoyé avec succès:', data);
      return data[0];
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
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
    console.log('Mise en place de la souscription pour les messages:', conversationId);
    
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        console.log('Nouveau message reçu via subscription:', payload.new);
        callback(payload.new as Message);
      })
      .subscribe();
  }
}
