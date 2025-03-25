/**
 * Interface pour les messages dans l'application
 */
export interface Message {
  id?: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender_type: 'host' | 'guest' | 'system';
  read?: boolean;
  attachments?: any[];
}

/**
 * Type pour les notifications de messages
 */
export interface MessageNotification {
  title: string;
  body: string;
  data?: {
    conversationId?: string;
    messageId?: string;
    propertyId?: string;
    [key: string]: any;
  };
}
