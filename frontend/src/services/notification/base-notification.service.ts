/**
 * Service de base pour les notifications
 * Cette classe sert de base pour les différentes implémentations
 * de services de notification (mobile, desktop, etc.)
 */
export abstract class BaseNotificationService {
  /**
   * Envoie une notification
   * @param title - Titre de la notification
   * @param body - Corps de la notification
   * @param data - Données supplémentaires (optionnel)
   */
  abstract sendNotification(title: string, body: string, data?: any): Promise<boolean>;

  /**
   * Initialise le service de notification
   */
  abstract initialize(): Promise<boolean>;

  /**
   * Demande l'autorisation pour envoyer des notifications
   */
  abstract requestPermission(): Promise<boolean>;

  /**
   * Vérifie si les notifications sont supportées
   */
  abstract isSupported(): boolean;
}
