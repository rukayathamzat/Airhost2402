import { BaseNotificationService } from './base-notification.service';
import { Message } from '../../types/message';

export class WebNotificationService extends BaseNotificationService {
  /**
   * Demande la permission pour les notifications web
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[NOTIF DEBUG] Les notifications ne sont pas supportées');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[NOTIF DEBUG] Permission de notification:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de la demande de permission:', error);
      return false;
    }
  }

  /**
   * Affiche une notification web pour un nouveau message
   */
  static async showMessageNotification(message: Message): Promise<void> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      console.warn('[NOTIF DEBUG] Notifications non disponibles ou non autorisées');
      return;
    }

    try {
      const notification = new Notification('Nouveau message', {
        body: message.content,
        icon: '/icons/icon-192x192.png',
        tag: `message-${message.id}`,
        data: {
          messageId: message.id,
          conversationId: message.conversation_id
        }
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        // Navigation vers la conversation
        window.location.href = `/chat/${message.conversation_id}`;
      };
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de l\'affichage de la notification:', error);
    }
  }

  /**
   * Vérifie si les notifications web sont activées
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    return this.isSupported() && Notification.permission === 'granted';
  }
} 