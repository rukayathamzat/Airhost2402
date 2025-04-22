import { WebNotificationService } from './web-notification.service';
import { MobileNotificationService } from './mobile-notification.service';
import { Message } from '../../types/message';

export class NotificationService {
  /**
   * Initialise les services de notification
   */
  static async init(): Promise<void> {
    console.log('[NOTIF DEBUG] Initialisation des services de notification');
    
    try {
      // Initialiser les deux services
      await WebNotificationService.init();
      await MobileNotificationService.init();
      
      console.log('[NOTIF DEBUG] Services de notification initialisés');
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de l\'initialisation des services:', error);
    }
  }

  /**
   * Gère la notification d'un nouveau message
   * Cette méthode est appelée par useMessagesRealtime
   */
  static async notifyNewMessage(message: Message): Promise<void> {
    console.log('[NOTIF DEBUG] Traitement d\'une notification de nouveau message');

    try {
      // Vérification stricte: ne jamais envoyer de notification pour les messages sortants
      // Double vérification pour être sûr
      if (message.direction !== 'inbound') {
        console.log('[NOTIF DEBUG] Message non entrant ou sortant détecté, pas de notification');
        console.log('[NOTIF DEBUG] Direction du message:', message.direction);
        return;
      }
      
      // Log de suivi pour débogage
      console.log('[NOTIF DEBUG] Message entrant confirmé, direction:', message.direction);
      console.log('[NOTIF DEBUG] Données de suivi:', message._notificationTracking || 'aucune');

      // Notifications web (navigateur)
      if (await WebNotificationService.areNotificationsEnabled()) {
        console.log('[NOTIF DEBUG] Envoi de la notification web');
        await WebNotificationService.showMessageNotification(message);
      }

      // Notifications push (mobile)
      const pushAvailable = await MobileNotificationService.arePushNotificationsAvailable();
      console.log('[NOTIF DEBUG] Notifications push disponibles:', pushAvailable);
      
      if (pushAvailable) {
        console.log('[NOTIF DEBUG] Envoi de la notification push');
        await MobileNotificationService.sendPushNotification(message);
      } else {
        console.log('[NOTIF DEBUG] Token FCM dans localStorage:', localStorage.getItem('fcm_token'));
        console.log('[NOTIF DEBUG] Service Worker enregistré:', MobileNotificationService.isServiceWorkerRegistered());
      }
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de l\'envoi des notifications:', error);
    }
  }

  /**
   * Configure les notifications pour l'appareil actuel
   */
  static async setupNotifications(): Promise<void> {
    console.log('[NOTIF DEBUG] Configuration des notifications');

    try {
      // Demander la permission pour les notifications web
      const webEnabled = await WebNotificationService.requestPermission();
      console.log('[NOTIF DEBUG] Notifications web activées:', webEnabled);

      // Si c'est un appareil mobile et que les notifications web sont activées,
      // on peut essayer d'activer les notifications push
      if (webEnabled && this.isMobileDevice()) {
        console.log('[NOTIF DEBUG] Appareil mobile détecté, configuration des notifications push');
        // La configuration FCM sera gérée par l'application mobile
        // Le token sera enregistré via MobileNotificationService.registerToken
      }
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de la configuration des notifications:', error);
    }
  }

  /**
   * Vérifie si l'appareil est mobile
   */
  private static isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}
