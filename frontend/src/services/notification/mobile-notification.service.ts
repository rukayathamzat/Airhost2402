import { supabase } from '../../lib/supabase';
import { NotificationProcessorService } from './notification-processor.service';

/**
 * Service de notification mobile simplifié
 * Gère les notifications pour les appareils mobiles sans dépendance à Firebase
 */
export class MobileNotificationService {
  /**
   * Enregistre un token FCM pour l'utilisateur actuel
   */
  public static async registerToken(token: string): Promise<boolean> {
    console.log('[MobileNotification] Enregistrement du token:', token);
    return await NotificationProcessorService.registerToken(token);
  }

  /**
   * Envoie une notification de test
   */
  public static async sendTestNotification(): Promise<boolean> {
    try {
      console.log('[MobileNotification] Envoi d\'une notification de test');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('[MobileNotification] Utilisateur non authentifié');
        return false;
      }
      
      // Simuler l'envoi d'une notification de test
      // Dans une implémentation réelle, cela appellerait une fonction Edge
      console.log('[MobileNotification] Notification de test envoyée avec succès');
      
      // Créer une notification locale pour simuler la réception
      if ('Notification' in window) {
        new Notification('Test de notification', {
          body: 'Ceci est une notification de test',
          icon: '/favicon.ico'
        });
      }
      
      return true;
    } catch (error) {
      console.error('[MobileNotification] Erreur lors de l\'envoi de la notification de test:', error);
      return false;
    }
  }
}
