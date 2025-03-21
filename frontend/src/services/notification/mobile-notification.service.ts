import { BaseNotificationService } from './base-notification.service';
import { supabase } from '../../lib/supabase';
import { Message } from '../../types/message';
import { requestFCMPermission, setMessagingCallback } from '../../lib/firebase';

export class MobileNotificationService extends BaseNotificationService {
  private static fcmToken: string | null = null;

  /**
   * Initialise le service de notification mobile
   */
  static async init(): Promise<void> {
    await super.init();
    await this.loadFCMToken();
    
    // Configurer le callback pour les messages FCM reçus quand l'app est au premier plan
    setMessagingCallback((payload: any) => {
      console.log('[NOTIF DEBUG] Message FCM reçu au premier plan:', payload);
      // Vous pouvez ajouter ici une logique pour gérer les notifications au premier plan
      // Par exemple, afficher une notification dans l'interface utilisateur
    });
    
    // Demander la permission et obtenir un token si on n'en a pas déjà un
    if (!this.fcmToken) {
      try {
        const token = await requestFCMPermission();
        if (token) {
          await this.registerToken(token);
        }
      } catch (error) {
        console.error('[NOTIF DEBUG] Erreur lors de l\'initialisation FCM:', error);
      }
    }
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
      console.log('[NOTIF DEBUG] Utilisation de l\'Edge Function Supabase pour l\'envoi de notification');
      
      // Récupération du token JWT pour authentifier la demande
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session utilisateur non disponible');
      }
      
      // Utilisation de l'Edge Function Supabase au lieu de la fonction Netlify
      const response = await fetch('https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/fcm-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
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
      console.log('[NOTIF DEBUG] Réponse de l\'Edge Function Supabase:', responseData);
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

  /**
   * Méthode de test pour envoyer une notification au token de test
   */
  static async sendTestNotification(): Promise<void> {
    try {
      console.log('[NOTIF DEBUG] Test d\'envoi de notification avec token test');
      
      // 1. Vérifier si nous avons un token FCM enregistré
      console.log('[NOTIF DEBUG] Token FCM actuel:', this.fcmToken);
      const localToken = localStorage.getItem('fcm_token');
      console.log('[NOTIF DEBUG] Token FCM dans localStorage:', localToken);
      
      // Récupération du token JWT pour authentifier la demande
      console.log('[NOTIF DEBUG] Récupération de la session utilisateur...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[NOTIF DEBUG] Erreur de session:', sessionError);
        throw new Error(`Erreur de session: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        console.error('[NOTIF DEBUG] Pas de token d\'accès dans la session');
        throw new Error('Session utilisateur non disponible');
      }
      
      console.log('[NOTIF DEBUG] Token JWT obtenu, envoi de la notification test');
      
      // URL de l'Edge Function Supabase
      const edgeFunctionUrl = 'https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/fcm-proxy';
      console.log('[NOTIF DEBUG] URL de l\'Edge Function:', edgeFunctionUrl);
      
      // Corps de la requête
      const requestBody = {
        to: this.fcmToken || 'test-fcm-token', // Utiliser le token réel si disponible
        notification: {
          title: 'Test de notification',
          body: 'Ceci est un test de notification push'
        },
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      };
      
      console.log('[NOTIF DEBUG] Corps de la requête:', JSON.stringify(requestBody));
      
      // Tentative d'envoi avec gestion d'erreur détaillée
      try {
        console.log('[NOTIF DEBUG] Envoi de la requête...');
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('[NOTIF DEBUG] Réponse reçue, statut:', response.status);
        
        // Tenter de récupérer le corps de la réponse même en cas d'erreur
        let responseData;
        try {
          responseData = await response.json();
          console.log('[NOTIF DEBUG] Réponse en JSON:', responseData);
        } catch (jsonError) {
          console.error('[NOTIF DEBUG] Impossible de parser la réponse en JSON:', jsonError);
          const textResponse = await response.text();
          console.log('[NOTIF DEBUG] Réponse en texte:', textResponse);
          responseData = { error: 'Format de réponse invalide', text: textResponse };
        }
        
        if (!response.ok) {
          console.error('[NOTIF DEBUG] La requête a échoué, code:', response.status);
          throw new Error(`Erreur HTTP ${response.status}: ${responseData.error || 'Erreur inconnue'}`);
        }
        
        // Succès
        console.log('[NOTIF DEBUG] Test de notification réussi!', responseData);
        return responseData;
      } catch (fetchError) {
        console.error('[NOTIF DEBUG] Erreur fetch:', fetchError);
        // Vérifier si c'est une erreur réseau
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          console.error('[NOTIF DEBUG] Erreur de connexion réseau. Vérifiez votre connexion internet.');
          throw new Error(`Erreur de connexion: ${fetchError.message}. Vérifiez que vous êtes connecté à internet.`);
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur globale lors du test de notification:', error);
      throw error;
    }
  }
}
