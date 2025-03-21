import { BaseNotificationService } from './base-notification.service';
import { supabase } from '../../lib/supabase';
import { Message } from '../../types/message';
// @ts-ignore - Ignorer l'erreur de type pour firebase
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
      
      try {
        // Ajouter un paramètre mode: 'no-cors' pour contourner CORS sur mobile
        // Cela rendra la réponse opaque mais permettra au moins d'envoyer la notification
        console.log('[NOTIF DEBUG] Envoi de la requête avec mode no-cors...');
        
        try {
          // Premier essai avec les en-têtes normaux
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(requestBody)
          });
          
          console.log('[NOTIF DEBUG] Réponse reçue, statut:', response.status);
          
          // Tenter de récupérer le corps de la réponse
          const responseData = await response.json();
          console.log('[NOTIF DEBUG] Réponse en JSON:', responseData);
          
          if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}: ${responseData.error || 'Erreur inconnue'}`);
          }
          
          // Succès
          console.log('[NOTIF DEBUG] Test de notification réussi!', responseData);
          return responseData;
        } catch (initialError) {
          // Si la première tentative échoue à cause de CORS, essayer en mode no-cors
          if (initialError instanceof TypeError && initialError.message.includes('fetch')) {
            console.log('[NOTIF DEBUG] Premier essai échoué, tentative avec mode no-cors');
            
            // En mode no-cors, certains en-têtes ne sont pas autorisés
            // et la méthode doit être GET ou POST simple
            const noCorsFetch = await fetch(edgeFunctionUrl, {
              method: 'POST',
              mode: 'no-cors',
              body: JSON.stringify(requestBody)
            });
            
            // La réponse sera opaque (status 0, type: 'opaque') mais la requête sera envoyée
            console.log('[NOTIF DEBUG] Requête no-cors envoyée, réponse:', noCorsFetch.type);
            
            // Simuler une notification locale car nous ne pouvons pas voir la réponse en mode no-cors
            if ('Notification' in window) {
              console.log('[NOTIF DEBUG] Simulation d\'une notification locale');
              
              const notification = new Notification('Test de notification', {
                body: 'Ceci est un test de notification (mode local)',
                icon: '/favicon.ico'
              });
              
              notification.onclick = () => {
                console.log('[NOTIF DEBUG] Notification locale cliquée');
                window.focus();
              };
              
              // On retourne void comme attendu par la signature
              console.log('[NOTIF DEBUG] Notification locale affichée');
              return;
            }
            
            console.log('[NOTIF DEBUG] Requête no-cors envoyée avec succès');
            return;
          }
          
          throw initialError;
        }
      } catch (fetchError) {
        console.error('[NOTIF DEBUG] Erreur fetch:', fetchError);
        
        // En cas d'erreur, tenter de simuler une notification locale
        if ('Notification' in window && Notification.permission === 'granted') {
          console.log('[NOTIF DEBUG] Erreur d\'envoi, simulation d\'une notification locale');
          
          // Créer et utiliser la notification locale
          new Notification('Test de notification', {
            body: 'Notification locale (après erreur Edge Function)',
            icon: '/favicon.ico'
          });
          
          // Lève quand même l'erreur d'origine pour l'afficher dans l'UI
          throw new Error(`Erreur de connexion: ${fetchError instanceof Error ? fetchError.message : 'Erreur inconnue'}. Une notification locale a été simulée à la place.`);
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur globale lors du test de notification:', error);
      throw error;
    }
  }
}
