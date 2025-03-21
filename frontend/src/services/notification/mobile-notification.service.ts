import { BaseNotificationService } from './base-notification.service';
import { supabase } from '../../lib/supabase';
import { Message } from '../../types/message';

export class MobileNotificationService extends BaseNotificationService {
  private static fcmToken: string | null = null;

  /**
   * Initialise le service de notification mobile
   */
  static async init(): Promise<void> {
    await super.init();
    await this.loadFCMToken();
  }

  /**
   * Charge le token FCM depuis le stockage local
   */
  private static async loadFCMToken(): Promise<void> {
    try {
      const token = localStorage.getItem('fcm_token');
      if (token) {
        this.fcmToken = token;
        console.log('[NOTIF DEBUG] Token FCM chargé depuis le stockage local');
      }
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors du chargement du token FCM:', error);
    }
  }

  /**
   * Enregistre un nouveau token FCM
   */
  static async registerToken(token: string): Promise<void> {
    console.log('[NOTIF DEBUG] Enregistrement du token FCM');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Sauvegarder le token localement
      localStorage.setItem('fcm_token', token);
      this.fcmToken = token;

      // Enregistrer dans Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          token,
          platform: 'fcm',
          subscription: {}, // Valeur par défaut pour satisfaire la contrainte NOT NULL
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
        
      console.log('[NOTIF DEBUG] Tentative d\'insertion dans push_subscriptions', {
        user_id: user.id,
        token,
        platform: 'fcm',
        subscription: {}
      });

      if (error) {
        throw error;
      }

      console.log('[NOTIF DEBUG] Token FCM enregistré avec succès');
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de l\'enregistrement du token FCM:', error);
      throw error;
    }
  }

  /**
   * Supprime le token FCM
   */
  static async removeToken(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Supprimer de Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Supprimer du stockage local
      localStorage.removeItem('fcm_token');
      this.fcmToken = null;

      console.log('[NOTIF DEBUG] Token FCM supprimé avec succès');
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de la suppression du token FCM:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification push via FCM
   */
  static async sendPushNotification(message: Message): Promise<void> {
    if (!this.fcmToken) {
      console.warn('[NOTIF DEBUG] Pas de token FCM disponible');
      return;
    }

    try {
      console.log('[NOTIF DEBUG] Utilisation de la fonction Netlify pour l\'envoi de notification');
      
      // Utilisation de la fonction Netlify au lieu de l'Edge Function Supabase
      const response = await fetch('/.netlify/functions/fcm-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: this.fcmToken,
          notification: {
            title: 'Nouveau message',
            body: message.content
          },
          data: {
            messageId: message.id,
            conversationId: message.conversation_id,
            type: 'new_message'
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'envoi de la notification');
      }

      // Traitement de la réponse
      const responseData = await response.json();
      console.log('[NOTIF DEBUG] Réponse de la fonction Netlify:', responseData);
      console.log('[NOTIF DEBUG] Notification push envoyée avec succès');
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de l\'envoi de la notification push:', error);
      throw error;
    }
  }

  /**
   * Vérifie si les notifications push sont disponibles
   */
  static async arePushNotificationsAvailable(): Promise<boolean> {
    return !!this.fcmToken && this.isServiceWorkerRegistered();
  }
}
