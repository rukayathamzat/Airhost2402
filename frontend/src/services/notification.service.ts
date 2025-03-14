import { supabase } from '../lib/supabase';

// Nous utilisons directement l'interface PushSubscription native du navigateur

export class NotificationService {
  private static swRegistration: ServiceWorkerRegistration | null = null;
  private static vapidPublicKey = 'BLBz9KoUgbH9aWFN_ftRGQQYYDKbCDPrVYvKlKKLiDDrBwiOLLkOK_DP1REzqgTcO0Qe2ZO0GCZqPpX_5_Vpcvs';

  /**
   * Initialise le service de notification
   */
  static async init(): Promise<void> {
    console.log('[NOTIF DEBUG] Initialisation du service de notification');
    
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[NOTIF DEBUG] Les notifications push ne sont pas supportées par ce navigateur');
      return;
    }

    try {
      // Vérifier si le service worker est déjà enregistré
      const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
      
      if (existingRegistration) {
        console.log('[NOTIF DEBUG] Service Worker déjà enregistré:', existingRegistration);
        this.swRegistration = existingRegistration;
      } else {
        // Enregistrer le service worker
        console.log('[NOTIF DEBUG] Enregistrement du Service Worker...');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('[NOTIF DEBUG] Service Worker enregistré avec succès:', registration);
        this.swRegistration = registration;
      }
      
      // Vérifier si l'utilisateur est déjà abonné
      const subscription = await this.getSubscription();
      const isSubscribed = !!subscription;
      console.log('[NOTIF DEBUG] Utilisateur abonné aux notifications push:', isSubscribed);
      console.log('[NOTIF DEBUG] Statut actuel de la permission Notification:', Notification.permission);
      
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
      console.log('[NOTIF DEBUG] Demande de permission pour les notifications...');
      console.log('[NOTIF DEBUG] Permission actuelle:', Notification.permission);
      
      // Si la permission est déjà accordée, s'abonner directement
      if (Notification.permission === 'granted') {
        console.log('[NOTIF DEBUG] Permission déjà accordée, abonnement direct');
        await this.subscribe();
        return true;
      }
      
      // Sinon, demander la permission
      const permission = await Notification.requestPermission();
      console.log('[NOTIF DEBUG] Permission de notification après demande:', permission);
      
      if (permission === 'granted') {
        console.log('[NOTIF DEBUG] Permission accordée, abonnement...');
        const subscription = await this.subscribe();
        console.log('[NOTIF DEBUG] Abonnement réussi?', !!subscription);
        return true;
      }
      
      console.log('[NOTIF DEBUG] Permission refusée');
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
    console.log('[NOTIF DEBUG] Tentative d\'abonnement aux notifications push');
    
    if (!this.swRegistration) {
      console.warn('[NOTIF DEBUG] Service Worker non enregistré, initialisation...');
      await this.init();
      
      if (!this.swRegistration) {
        console.error('[NOTIF DEBUG] Impossible d\'initialiser le Service Worker');
        return null;
      }
    }

    try {
      // Récupérer l'abonnement existant
      let subscription = await this.getSubscription();
      
      // Si déjà abonné, retourner l'abonnement existant
      if (subscription) {
        console.log('[NOTIF DEBUG] Déjà abonné aux notifications push');
        return subscription;
      }
      
      console.log('[NOTIF DEBUG] Création d\'un nouvel abonnement...');
      
      // Créer un nouvel abonnement
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      console.log('[NOTIF DEBUG] Application Server Key générée');
      
      try {
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
        
        console.log('[NOTIF DEBUG] Abonné aux notifications push:', subscription);
        
        if (subscription) {
          // Enregistrer l'abonnement sur le serveur
          await this.updateSubscriptionOnServer(subscription);
        }
        
        return subscription;
      } catch (subscribeError) {
        console.error('[NOTIF DEBUG] Erreur lors de l\'abonnement push:', subscribeError);
        
        // Vérifier si l'erreur est due à un problème de permission
        if (Notification.permission !== 'granted') {
          console.warn('[NOTIF DEBUG] Permission non accordée pour les notifications');
        }
        
        return null;
      }
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
    console.log('[NOTIF DEBUG] Récupération de l\'abonnement actuel');
    
    if (!this.swRegistration) {
      console.warn('[NOTIF DEBUG] Service Worker non enregistré');
      return null;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      console.log('[NOTIF DEBUG] Abonnement récupéré:', subscription ? 'Oui' : 'Non');
      if (subscription) {
        console.log('[NOTIF DEBUG] Détails de l\'abonnement:', {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime
        });
      }
      return subscription;
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de la récupération de l\'abonnement aux notifications push:', error);
      return null;
    }
  }

  /**
   * Met à jour l'abonnement sur le serveur
   */
  static async updateSubscriptionOnServer(subscription: PushSubscription): Promise<void> {
    console.log('[NOTIF DEBUG] Mise à jour de l\'abonnement sur le serveur');
    
    if (!subscription) {
      console.warn('[NOTIF DEBUG] Aucun abonnement à mettre à jour');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      
      if (!user) {
        console.warn('[NOTIF DEBUG] Utilisateur non authentifié');
        return;
      }
      
      console.log('[NOTIF DEBUG] Préparation de l\'upsert pour user_id:', user.id);
      
      // Convertir l'objet subscription en objet JavaScript simple pour Supabase
      const subscriptionObj = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: {
          p256dh: subscription.toJSON().keys.p256dh,
          auth: subscription.toJSON().keys.auth
        }
      };
      
      console.log('[NOTIF DEBUG] Données d\'abonnement à enregistrer:', 
        JSON.stringify(subscriptionObj).substring(0, 100) + '...');
      
      // Utiliser upsert avec un objet JavaScript qui sera converti en JSONB
      const { error, data: upsertResult } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: subscriptionObj,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        console.error('[NOTIF DEBUG] Erreur Supabase lors de l\'upsert:', error);
        throw error;
      }
      
      console.log('[NOTIF DEBUG] Abonnement mis à jour sur le serveur avec succès', upsertResult);
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de la mise à jour de l\'abonnement sur le serveur:', error);
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
    console.log('[NOTIF DEBUG] Vérification si les notifications sont activées');
    
    if (!('Notification' in window)) {
      console.log('[NOTIF DEBUG] API Notification non disponible');
      return false;
    }
    
    console.log('[NOTIF DEBUG] Permission Notification:', Notification.permission);
    if (Notification.permission !== 'granted') {
      console.log('[NOTIF DEBUG] Permission non accordée');
      return false;
    }
    
    // Tester si on peut créer une notification directement
    try {
      // Vérifier si le service worker est actif
      if (!this.swRegistration) {
        console.log('[NOTIF DEBUG] Service Worker non enregistré, initialisation...');
        await this.init();
      }
      
      const subscription = await this.getSubscription();
      console.log('[NOTIF DEBUG] Abonnement aux notifications:', subscription ? 'Actif' : 'Inactif');
      
      // Si pas d'abonnement mais permission accordée, essayer de s'abonner
      if (!subscription && Notification.permission === 'granted') {
        console.log('[NOTIF DEBUG] Permission accordée mais pas d\'abonnement, tentative d\'abonnement');
        await this.subscribe();
        const newSubscription = await this.getSubscription();
        return !!newSubscription;
      }
      
      return !!subscription;
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de la vérification des notifications:', error);
      return false;
    }
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
