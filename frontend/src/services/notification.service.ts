import { supabase } from '../lib/supabase';

// Nous utilisons directement l'interface PushSubscription native du navigateur

export class NotificationService {
  private static swRegistration: ServiceWorkerRegistration | null = null;
  private static vapidPublicKey = 'BLBz9KoUgbH9aWFN_ftRGQQYYDKbCDPrVYvKlKKLiDDrBwiOLLkOK_DP1REzqgTcO0Qe2ZO0GCZqPpX_5_Vpcvs';

  /**
   * Initialise le service de notification
   */
  static async init(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Les notifications push ne sont pas supportées par ce navigateur');
      return;
    }

    try {
      // Enregistrer le service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker enregistré avec succès:', registration);
      
      this.swRegistration = registration;
      
      // Vérifier si l'utilisateur est déjà abonné
      const subscription = await this.getSubscription();
      const isSubscribed = !!subscription;
      console.log('Utilisateur abonné aux notifications push:', isSubscribed);
      
      if (isSubscribed) {
        await this.updateSubscriptionOnServer(subscription);
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du service worker:', error);
    }
  }

  /**
   * Demande la permission pour les notifications et s'abonne
   */
  static async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      console.log('Permission de notification:', permission);
      
      if (permission === 'granted') {
        await this.subscribe();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erreur lors de la demande de permission pour les notifications:', error);
      return false;
    }
  }

  /**
   * S'abonne aux notifications push
   */
  static async subscribe(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      console.warn('Service Worker non enregistré');
      return null;
    }

    try {
      // Récupérer l'abonnement existant
      let subscription = await this.getSubscription();
      
      // Si déjà abonné, retourner l'abonnement existant
      if (subscription) {
        console.log('Déjà abonné aux notifications push');
        return subscription;
      }
      
      // Créer un nouvel abonnement
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      
      console.log('Abonné aux notifications push:', subscription);
      
      if (subscription) {
        // Enregistrer l'abonnement sur le serveur
        await this.updateSubscriptionOnServer(subscription);
      }
      
      return subscription;
    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux notifications push:', error);
      return null;
    }
  }

  /**
   * Se désabonne des notifications push
   */
  static async unsubscribe(): Promise<boolean> {
    if (!this.swRegistration) {
      console.warn('Service Worker non enregistré');
      return false;
    }

    try {
      const subscription = await this.getSubscription();
      
      if (!subscription) {
        console.log('Pas d\'abonnement aux notifications push');
        return true;
      }
      
      // Se désabonner - TypeScript native PushSubscription a cette méthode
      const success = await subscription.unsubscribe();
      
      if (success) {
        // Supprimer l'abonnement du serveur
        await this.deleteSubscriptionFromServer(subscription);
        console.log('Désabonné des notifications push');
      }
      
      return success;
    } catch (error) {
      console.error('Erreur lors du désabonnement des notifications push:', error);
      return false;
    }
  }

  /**
   * Récupère l'abonnement actuel
   */
  static async getSubscription(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      console.warn('Service Worker non enregistré');
      return null;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      return subscription;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement aux notifications push:', error);
      return null;
    }
  }

  /**
   * Met à jour l'abonnement sur le serveur
   */
  static async updateSubscriptionOnServer(subscription: PushSubscription): Promise<void> {
    if (!subscription) {
      console.warn('Aucun abonnement à mettre à jour');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Utilisateur non authentifié');
        return;
      }
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: JSON.stringify(subscription),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        throw error;
      }
      
      console.log('Abonnement mis à jour sur le serveur');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'abonnement sur le serveur:', error);
    }
  }

  /**
   * Supprime l'abonnement du serveur
   */
  static async deleteSubscriptionFromServer(subscription: PushSubscription | null): Promise<void> {
    if (!subscription) {
      console.warn('Aucun abonnement à supprimer');
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Utilisateur non authentifié');
        return;
      }
      
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      console.log('Abonnement supprimé du serveur');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'abonnement du serveur:', error);
    }
  }

  /**
   * Vérifie si les notifications sont activées
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    // Vérifier la permission
    if (Notification.permission !== 'granted') {
      return false;
    }

    // Vérifier l'abonnement
    const subscription = await this.getSubscription();
    return !!subscription;
  }

  /**
   * Convertit une chaîne base64 en tableau Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
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
