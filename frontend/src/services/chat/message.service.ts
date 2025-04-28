import { supabase } from '../../lib/supabase';
import { NotificationService } from '../notification/notification.service';

// Définition des types
export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: 'user' | 'assistant' | 'system';
  created_at: string;
  updated_at: string;
  metadata?: any;
  is_read?: boolean;
  direction?: 'inbound' | 'outbound';
}

export interface SendMessageParams {
  conversation_id: string;
  content: string;
  sender_type: 'user' | 'assistant' | 'system';
  metadata?: any;
  message_type?: string;
}

/**
 * Service de gestion des messages
 */
export class MessageService {
  /**
   * Récupère les messages d'une conversation
   * @param conversationId ID de la conversation
   * @param forceNetwork Force la récupération depuis le réseau même si des données sont en cache
   */
  static async getMessages(conversationId: string, forceNetwork: boolean = false): Promise<Message[]> {
    // Utiliser forceNetwork pour déterminer si on doit ignorer le cache
    const options = forceNetwork ? { head: false } : undefined;
    
    const { data, error } = await supabase
      .from('messages')
      .select('*', options)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Envoie un message dans une conversation
   * @param params Paramètres du message ou ID de la conversation
   * @param content Contenu du message (si le premier paramètre est l'ID de la conversation)
   * @param message_type Type de message (si le premier paramètre est l'ID de la conversation)
   */
  static async sendMessage(
    params: SendMessageParams | string,
    content?: string,
    message_type?: string
  ): Promise<Message | null> {
    // Compatibilité avec l'ancienne API
    let messageParams: SendMessageParams;
    
    if (typeof params === 'string') {
      // Si params est une chaîne, c'est l'ID de la conversation
      messageParams = {
        conversation_id: params,
        content: content || '',
        sender_type: 'user',
        message_type: message_type
      };
    } else {
      // Sinon, c'est l'objet de paramètres complet
      messageParams = params;
    }
    const { conversation_id, content: messageContent, sender_type, metadata: messageMetadata, message_type: messageType } = messageParams;
    
    const message = {
      conversation_id,
      content: messageContent,
      sender_type,
      metadata: {
        ...messageMetadata,
        message_type: messageType || 'text'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_read: sender_type !== 'user',
      direction: sender_type === 'user' ? 'outbound' : 'inbound'
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      return null;
    }

    // Envoyer une notification si le message vient de l'assistant
    if (sender_type === 'assistant') {
      try {
        // Vérifier si les notifications sont activées
        const notificationsEnabled = await NotificationService.areNotificationsEnabled();
        
        if (notificationsEnabled) {
          // Envoyer une notification
          await NotificationService.notifyNewMessage(data);
        } else {
          console.log('Notifications non activées, aucune notification envoyée');
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
      }
    }

    return data;
  }

  /**
   * Marque un message comme lu
   */
  static async markAsRead(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      console.error('Erreur lors du marquage du message comme lu:', error);
      return false;
    }

    return true;
  }

  /**
   * Met à jour les métadonnées d'un message
   */
  static async updateMessageMetadata(messageId: string, metadata: any): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ 
        metadata,
        updated_at: new Date().toISOString() 
      })
      .eq('id', messageId);

    if (error) {
      console.error('Erreur lors de la mise à jour des métadonnées du message:', error);
      return false;
    }

    return true;
  }
}
