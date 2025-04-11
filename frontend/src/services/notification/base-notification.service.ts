
export class BaseNotificationService {
  protected static swRegistration: ServiceWorkerRegistration | null = null;
  protected static vapidPublicKey = 'BLBz9KoUgbH9aWFN_ftRGQQYYDKbCDPrVYvKlKKLiDDrBwiOLLkOK_DP1REzqgTcO0Qe2ZO0GCZqPpX_5_Vpcvs';

  /**
   * Initialise le service de notification de base
   */
  static async init(): Promise<void> {
    console.log('[NOTIF DEBUG] Initialisation du service de notification de base');
    
    if (!('serviceWorker' in navigator)) {
      console.warn('[NOTIF DEBUG] Service Worker non supporté');
      return;
    }

    try {
      const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
      
      if (existingRegistration) {
        console.log('[NOTIF DEBUG] Service Worker déjà enregistré:', existingRegistration);
        this.swRegistration = existingRegistration;
      } else {
        console.log('[NOTIF DEBUG] Enregistrement du Service Worker...');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('[NOTIF DEBUG] Service Worker enregistré avec succès:', registration);
        this.swRegistration = registration;
      }
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de l\'initialisation:', error);
    }
  }

  /**
   * Vérifie si les notifications sont supportées
   */
  static isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Vérifie si le service worker est enregistré
   */
  static isServiceWorkerRegistered(): boolean {
    return !!this.swRegistration;
  }

  /**
   * Convertit une chaîne base64 en tableau Uint8Array
   */
  protected static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}
