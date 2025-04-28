import { supabase } from '../../lib/supabase';

/**
 * Service de notification simplifié
 * Gère les notifications sans dépendance à Firebase
 */
export class NotificationService {
  private static swRegistration: ServiceWorkerRegistration | null = null;
  private static vapidPublicKey = 'BLBz9KoUgbH9aWFN_ftRGQQYYDKbCDPrVYvKlKKLiDDrBwiOLLkOK_DP1REzqgTcO0Qe2ZO0GCZqPpX_5_Vpcvs';

  /**
   * Initialise le service de notification
   */
  public static async init(): Promise<boolean> {
    console.log('[Notification] Initialisation du service de notification simplifié');
    try {
      // Vérifier si le navigateur supporte les notifications
      if (!('Notification' in window)) {
        console.warn('[Notification] Ce navigateur ne supporte pas les notifications');
        return false;
      }

      // Vérifier si le navigateur supporte les Service Workers
      if (!('serviceWorker' in navigator)) {
        console.warn('[Notification] Ce navigateur ne supporte pas les Service Workers');
        return false;
      }
      
      // Enregistrer le service worker si possible
      if ('serviceWorker' in navigator) {
        try {
          this.swRegistration = await navigator.serviceWorker.ready;
          console.log('[Notification] Service Worker enregistré:', this.swRegistration);
          
          // Enregistrer l'utilisateur dans la base de données
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('[Notification] Utilisateur authentifié:', user.id);
          }
        } catch (error) {
          console.error('[Notification] Erreur lors de l\'enregistrement du Service Worker:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('[Notification] Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  /**
   * Vérifie si les notifications sont activées
   */
  public static async areNotificationsEnabled(): Promise<boolean> {
    return Notification.permission === 'granted';
  }

  /**
   * Demande la permission pour les notifications
   */
  public static async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[Notification] Erreur lors de la demande de permission:', error);
      return false;
    }
  }

  /**
   * Désactive les notifications
   */
  public static async unsubscribe(): Promise<boolean> {
    console.log('[Notification] Désactivation des notifications');
    return true;
  }

  /**
   * Notifie l'utilisateur d'un nouveau message
   */
  public static async notifyNewMessage(message: any): Promise<boolean> {
    try {
      if (!await this.areNotificationsEnabled()) {
        console.log('[Notification] Notifications non activées');
        return false;
      }

      // Créer une notification simple sans passer par FCM
      if ('Notification' in window) {
        // Utiliser le vapidPublicKey pour l'identification (dans une implémentation réelle)
        console.log('[Notification] Utilisation de la clé VAPID:', this.vapidPublicKey.substring(0, 10) + '...');
        
        // Créer la notification
        new Notification('Nouveau message', {
          body: message.content || 'Vous avez reçu un nouveau message',
          icon: '/favicon.ico'
        });
        
        // Enregistrer la notification dans Supabase (optionnel)
        if (this.swRegistration) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('notification_logs').insert({
              user_id: user.id,
              message_id: message.id,
              created_at: new Date().toISOString()
            });
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Notification] Erreur lors de l\'envoi de notification:', error);
      return false;
    }
  }
}
