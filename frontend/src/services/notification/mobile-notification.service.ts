import { BaseNotificationService } from './base-notification.service';
import { supabase } from '../../lib/supabase';
import { Message } from '../../types/message';
// @ts-ignore - Ignorer l'erreur de type pour firebase
import { requestFCMPermission, setMessagingCallback } from '../../lib/firebase';

export class MobileNotificationService extends BaseNotificationService {
  private static fcmToken: string | null = null;
  private static instance: MobileNotificationService;
  private initialized = false;

  private constructor() {
    super();
  }

  public static getInstance(): MobileNotificationService {
    if (!MobileNotificationService.instance) {
      MobileNotificationService.instance = new MobileNotificationService();
    }
    return MobileNotificationService.instance;
  }

  /**
   * Initialise le service de notification mobile
   */
  public static async init(): Promise<void> {
    const instance = MobileNotificationService.getInstance();
    if (!instance.initialized) {
      await super.init();
      await instance.loadFCMToken();
      
      // Configurer le callback pour les messages FCM reçus quand l'app est au premier plan
      setMessagingCallback((payload: any) => {
        console.log('[NOTIF DEBUG] Message FCM reçu au premier plan:', payload);
        // Vous pouvez ajouter ici une logique pour gérer les notifications au premier plan
        // Par exemple, afficher une notification dans l'interface utilisateur
      });
      
      // Demander la permission et obtenir un token si on n'en a pas déjà un
      if (!MobileNotificationService.fcmToken) {
        try {
          const token = await requestFCMPermission();
          if (token) {
            await instance.registerToken(token);
          }
        } catch (error) {
          console.error('[NOTIF DEBUG] Erreur lors de l\'initialisation FCM:', error);
        }
      } else {
        // Vérifier que le token existant est bien enregistré dans Supabase
        instance.verifyTokenRegistration();
      }
      
      // Configurer une vérification périodique du token
      instance.setupPeriodicTokenCheck();

      instance.initialized = true;
    }
  }
  
  /**
   * Configure une vérification périodique du token FCM
   * Cela permet de s'assurer que le token est toujours valide et enregistré
   */
  private static setupPeriodicTokenCheck(): void {
    // Vérifier le token toutes les 12 heures
    const CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 heures en millisecondes
    
    const performCheck = () => {
      MobileNotificationService.verifyTokenRegistration();
    };
    
    // Première vérification après 5 minutes
    setTimeout(performCheck, 5 * 60 * 1000);
    
    // Vérifications périodiques ensuite
    setInterval(performCheck, CHECK_INTERVAL);
    
    // Vérifier également à chaque reprise de l'application (visibilitychange)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[NOTIF DEBUG] Application revenue au premier plan, vérification du token FCM');
        performCheck();
      }
    });
  }
  
  /**
   * Vérifie que le token FCM actuel est bien enregistré dans Supabase
   * Si ce n'est pas le cas, tente de le réenregistrer
   */
  private static async verifyTokenRegistration(): Promise<void> {
    try {
      if (!MobileNotificationService.fcmToken) {
        console.log('[NOTIF DEBUG] Pas de token FCM à vérifier');
        return;
      }
      
      console.log('[NOTIF DEBUG] Vérification de l\'enregistrement du token FCM:', MobileNotificationService.fcmToken.substring(0, 10) + '...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[NOTIF DEBUG] Impossible de vérifier le token: utilisateur non authentifié');
        return;
      }
      
      // Vérifier si le token est enregistré dans Supabase
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, updated_at')
        .eq('user_id', user.id)
        .eq('token', MobileNotificationService.fcmToken)
        .single();
      
      if (error || !data) {
        console.warn('[NOTIF DEBUG] Token FCM non trouvé dans la base de données, réenregistrement...');
        await MobileNotificationService.registerToken(MobileNotificationService.fcmToken);
        return;
      }
      
      // Vérifier si l'enregistrement date de plus de 7 jours
      const lastUpdate = new Date(data.updated_at);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate > 7) {
        console.log(`[NOTIF DEBUG] Enregistrement du token datant de ${daysSinceUpdate} jours, mise à jour...`);
        await MobileNotificationService.registerToken(MobileNotificationService.fcmToken);
      } else {
        console.log('[NOTIF DEBUG] Token FCM correctement enregistré et à jour');
      }
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de la vérification du token FCM:', error);
    }
  }

  /**
   * Charge le token FCM depuis le stockage local
   */
  private static async loadFCMToken(): Promise<void> {
    try {
      const token = localStorage.getItem('fcm_token');
      if (token) {
        MobileNotificationService.fcmToken = token;
        console.log('[NOTIF DEBUG] Token FCM chargé depuis le stockage local');
      }
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors du chargement du token FCM:', error);
    }
  }

  /**
   * Enregistre un nouveau token FCM avec mécanisme de reprise
   */
  static async registerToken(token: string): Promise<void> {
    console.log('[NOTIF DEBUG] Enregistrement du token FCM:', token.substring(0, 10) + '...');
    
    // Sauvegarder le token localement immédiatement
    localStorage.setItem('fcm_token', token);
    MobileNotificationService.fcmToken = token;
    
    // Variable pour le nombre de tentatives
    let attempts = 0;
    const maxAttempts = 3;
    
    const registerWithRetry = async (): Promise<boolean> => {
      attempts++;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.warn(`[NOTIF DEBUG] Tentative ${attempts}/${maxAttempts}: Utilisateur non authentifié`);
          return false;
        }
        
        // Log des informations d'enregistrement du token
        console.log(`[NOTIF DEBUG] Enregistrement du token FCM pour l'utilisateur ${user.id}`);
        
        console.log(`[NOTIF DEBUG] Tentative ${attempts}/${maxAttempts} d'insertion dans push_subscriptions`, {
          user_id: user.id,
          token: token.substring(0, 10) + '...',
          platform: 'fcm'
        });

        // Appeler la fonction Supabase qui gère l'upsert (mise à jour ou insertion)
        // Cette fonction garantit qu'un seul token est conservé par utilisateur (le plus récent)
        const { error: functionError } = await supabase
          .rpc('upsert_push_token', {
            p_user_id: user.id,
            p_token: token,
            p_platform: 'fcm'
          });
          
        if (functionError) {
          console.error(`[NOTIF DEBUG] Erreur lors de l'appel à upsert_push_token: ${functionError.message}`);
          throw functionError;
        }
        
        console.log('[NOTIF DEBUG] Token FCM mis à jour avec succès via la fonction upsert_push_token');

        console.log('[NOTIF DEBUG] Token FCM enregistré avec succès');
        return true;
      } catch (error) {
        console.error(`[NOTIF DEBUG] Erreur lors de la tentative ${attempts}/${maxAttempts}:`, error);
        
        // Vérifier si on peut réessayer
        if (attempts < maxAttempts) {
          // Attente exponentielle avant la prochaine tentative
          const delay = Math.pow(2, attempts) * 1000;
          console.log(`[NOTIF DEBUG] Nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return registerWithRetry();
        }
        
        console.error('[NOTIF DEBUG] Nombre maximum de tentatives atteint. Échec de l\'enregistrement du token');
        return false;
      }
    };
    
    // Démarrer le processus d'enregistrement avec retries
    try {
      await registerWithRetry();
    } catch (finalError) {
      console.error('[NOTIF DEBUG] Erreur fatale lors de l\'enregistrement du token FCM:', finalError);
      // Ne pas propager l'erreur pour éviter de bloquer l'application
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
      MobileNotificationService.fcmToken = null;

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
    console.log('[NOTIF DEBUG] Tentative d\'envoi de notification push pour le message:', message.id);
    
    // Vérification explicite: ne jamais envoyer de notification pour les messages sortants
    if (message.is_outgoing) {
      console.log('[NOTIF DEBUG] Message sortant, pas de notification envoyée');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('[NOTIF DEBUG] Impossible d\'envoyer la notification: utilisateur non authentifié');
        return;
      }

      // Récupérer le token FCM de l'utilisateur
      const { data: subscription, error: fetchError } = await supabase
        .from('push_subscriptions')
        .select('token')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !subscription) {
        console.warn('[NOTIF DEBUG] Pas de token FCM trouvé pour l\'utilisateur');
        return;
      }

      // Préparer la notification
      const notification = {
        to: subscription.token,
        notification: {
          title: 'Nouveau message',
          body: message.content,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `message-${message.id}`,
          vibrate: [100, 50, 100]
        },
        data: {
          messageId: message.id,
          conversationId: message.conversation_id
        }
      };

      // Envoyer la notification via l'Edge Function
      const { error: sendError } = await supabase.functions.invoke('fcm-proxy', {
        body: notification
      });

      if (sendError) {
        throw sendError;
      }

      console.log('[NOTIF DEBUG] Notification push envoyée avec succès');
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de l\'envoi de la notification push:', error);
    }
  }

  /**
   * Vérifie si les notifications push sont disponibles
   */
  static async arePushNotificationsAvailable(): Promise<boolean> {
    try {
      // Vérifier si le service worker est enregistré
      if (!MobileNotificationService.isServiceWorkerRegistered()) {
        console.log('[NOTIF DEBUG] Service Worker non enregistré');
        return false;
      }

      // Vérifier si on a un token FCM
      if (!MobileNotificationService.fcmToken) {
        console.log('[NOTIF DEBUG] Pas de token FCM');
        return false;
      }

      // Vérifier si l'utilisateur est authentifié
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[NOTIF DEBUG] Utilisateur non authentifié');
        return false;
      }

      // Vérifier si le token est enregistré dans Supabase
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('token', MobileNotificationService.fcmToken)
        .single();

      if (error || !data) {
        console.log('[NOTIF DEBUG] Token FCM non trouvé dans la base de données');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de la vérification des notifications push:', error);
      return false;
    }
  }

  /**
   * Vérifie si le service worker est enregistré
   */
  static isServiceWorkerRegistered(): boolean {
    return super.isServiceWorkerRegistered();
  }

  /**
   * Récupère la permission de notification actuelle
   */
  static getNotificationPermission(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Envoie une notification de test
   */
  static async sendTestNotification(): Promise<void> {
    try {
      const testMessage: Message = {
        id: 'test-' + Date.now(),
        content: 'Ceci est une notification de test',
        conversation_id: 'test',
        is_outgoing: false,
        created_at: new Date().toISOString()
      };

      await MobileNotificationService.sendPushNotification(testMessage);
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur lors de l\'envoi de la notification de test:', error);
    }
  }

  public async sendMobileNotification(userId: string, title: string, body: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: { userId, title, body }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending mobile notification:', error);
      throw error;
    }
  }
} 