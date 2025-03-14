import { supabase } from '../../lib/supabase';
import { NotificationService } from '../notification.service';

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
          const message = payload.new as Message;
          callback(message);
          
          // Envoyer une notification si le message est entrant et que nous ne sommes pas sur la page de chat
          if (message.direction === 'inbound') {
            this.notifyNewMessage(message, conversationId);
          }
        }
      })
      .subscribe((status) => {
        console.log(`[${new Date().toISOString()}] Status de la souscription messages:`, status);
      });
  }
  
  /**
   * Envoie une notification pour un nouveau message
   */
  private static async notifyNewMessage(message: Message, conversationId: string) {
    try {
      // Vérifier si nous sommes sur la page de chat pour cette conversation
      const isOnChatPage = window.location.pathname.includes('/chat');
      const urlParams = new URLSearchParams(window.location.search);
      const currentConversationId = urlParams.get('id');
      
      // Si nous sommes sur la page de chat pour cette conversation, ne pas envoyer de notification
      if (isOnChatPage && currentConversationId === conversationId) {
        console.log('Sur la page de chat pour cette conversation, pas de notification');
        return;
      }
      
      // Vérifier si les notifications sont activées
      const notificationsEnabled = await NotificationService.areNotificationsEnabled();
      if (!notificationsEnabled) {
        console.log('Notifications désactivées, pas d\’envoi de notification');
        return;
      }
      
      // Récupérer les détails de la conversation pour le titre de la notification
      const { data: conversation } = await supabase
        .from('conversations')
        .select('guest_name')
        .eq('id', conversationId)
        .single();
      
      // Créer la notification
      const title = conversation?.guest_name || 'Nouveau message';
      const options = {
        body: message.content,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `message-${conversationId}`,  // Regrouper les notifications par conversation
        data: {
          url: `/chat?id=${conversationId}`,
          conversationId
        },
        vibrate: [100, 50, 100],
        timestamp: new Date(message.created_at).getTime()
      } as NotificationOptions;
      
      // Afficher la notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, options);
      }
      
      console.log(`Notification envoyée pour le message: ${message.id}`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }
  }
}
