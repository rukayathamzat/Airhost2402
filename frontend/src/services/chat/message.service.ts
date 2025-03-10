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
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Mise en place de la souscription pour les messages de la conversation:`, conversationId);
    
    // Utiliser un format de canal plus spécifique en suivant les meilleures pratiques de Supabase
    return supabase
      .channel(`public:messages:conversation_id=eq.${conversationId}`)
      .on('postgres_changes', {
        event: '*',  // Écouter tous les événements (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        const receiveTimestamp = new Date().toISOString();
        console.log(`[${receiveTimestamp}] REALTIME: Événement message reçu:`, payload.eventType);
        console.log(`[${receiveTimestamp}] REALTIME: Nouveau message:`, payload.new);
        
        // S'assurer que les données sont valides avant de notifier les composants
        if (payload.new) {
          callback(payload.new as Message);
        }
      })
      .subscribe((status) => {
        console.log(`[${new Date().toISOString()}] Status de la souscription messages:`, status);
      });
  }
}
