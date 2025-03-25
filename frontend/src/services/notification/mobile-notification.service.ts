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
    } else {
      // Vérifier que le token existant est bien enregistré dans Supabase
      this.verifyTokenRegistration();
    }
    
    // Configurer une vérification périodique du token
    this.setupPeriodicTokenCheck();
  }
  
  /**
   * Configure une vérification périodique du token FCM
   * Cela permet de s'assurer que le token est toujours valide et enregistré
   */
  private static setupPeriodicTokenCheck(): void {
    // Vérifier le token toutes les 12 heures
    const CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 heures en millisecondes
    
    const performCheck = () => {
      this.verifyTokenRegistration();
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
      if (!this.fcmToken) {
        console.log('[NOTIF DEBUG] Pas de token FCM à vérifier');
        return;
      }
      
      console.log('[NOTIF DEBUG] Vérification de l\'enregistrement du token FCM:', this.fcmToken.substring(0, 10) + '...');
      
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
        .eq('token', this.fcmToken)
        .single();
      
      if (error || !data) {
        console.warn('[NOTIF DEBUG] Token FCM non trouvé dans la base de données, réenregistrement...');
        await this.registerToken(this.fcmToken);
        return;
      }
      
      // Vérifier si l'enregistrement date de plus de 7 jours
      const lastUpdate = new Date(data.updated_at);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate > 7) {
        console.log(`[NOTIF DEBUG] Enregistrement du token datant de ${daysSinceUpdate} jours, mise à jour...`);
        await this.registerToken(this.fcmToken);
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
        this.fcmToken = token;
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
    this.fcmToken = token;
    
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
        
        // Préparer les données à insérer
        const subscriptionData = {
          user_id: user.id,
          token,
          platform: 'fcm',
          subscription: {}, // Valeur par défaut pour satisfaire la contrainte NOT NULL
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log(`[NOTIF DEBUG] Tentative ${attempts}/${maxAttempts} d'insertion dans push_subscriptions`, {
          user_id: user.id,
          token: token.substring(0, 10) + '...',
          platform: 'fcm'
        });

        // Tenter d'abord un upsert avec onConflict sur la combinaison user_id et token
        const { error: upsertError } = await supabase
          .from('push_subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'user_id,token'
          });
          
        // Si l'upsert échoue à cause d'un problème avec onConflict
        if (upsertError) {
          console.warn(`[NOTIF DEBUG] Échec de l'upsert (conflit): ${upsertError.message}`);
          
          // Essayer une approche alternative : vérifier si l'entrée existe déjà
          const { data: existingTokens } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('token', token);
            
          if (existingTokens && existingTokens.length > 0) {
            // Le token existe déjà, mettre à jour
            console.log('[NOTIF DEBUG] Token existant trouvé, mise à jour');
            const { error: updateError } = await supabase
              .from('push_subscriptions')
              .update({
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('token', token);
              
            if (updateError) {
              throw updateError;
            }
          } else {
            // Le token n'existe pas, insérer
            console.log('[NOTIF DEBUG] Token non trouvé, insertion');
            const { error: insertError } = await supabase
              .from('push_subscriptions')
              .insert(subscriptionData);
              
            if (insertError) {
              throw insertError;
            }
          }
        }

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
    console.log('[NOTIF DEBUG] Tentative d\'envoi de notification push pour le message:', message.id);
    
    // Vérifier tous les prérequis
    if (!this.fcmToken) {
      console.warn('[NOTIF DEBUG] Pas de token FCM disponible');
      return;
    }
    
    // Vérifier les permissions
    const permission = this.getNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[NOTIF DEBUG] Permission de notification non accordée:', permission);
      return;
    }
    
    // Vérifier que le service worker est enregistré
    const isRegistered = this.isServiceWorkerRegistered();
    if (!isRegistered) {
      console.warn('[NOTIF DEBUG] Service worker non enregistré');
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
      // Utiliser l'URL Supabase configurée dans l'environnement
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tornfqtvnzkgnwfudxdb.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/fcm-proxy`, {
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
    // Vérifier si un token FCM est disponible
    const fcmToken = this.fcmToken || localStorage.getItem('fcm_token');
    console.log('[NOTIF DEBUG] Vérification disponibilité notifications push - Token FCM:', !!fcmToken);
    
    // Vérifier si le service worker est enregistré
    const isSwRegistered = this.isServiceWorkerRegistered();
    console.log('[NOTIF DEBUG] Vérification disponibilité notifications push - Service Worker:', isSwRegistered);
    
    // Vérifier si les notifications sont autorisées
    const notificationPermission = this.getNotificationPermission();
    console.log('[NOTIF DEBUG] Vérification disponibilité notifications push - Permission:', notificationPermission);
    
    return !!fcmToken && isSwRegistered && notificationPermission === 'granted';
  }

  /**
   * Méthode de test pour envoyer une notification au token de test
   */
  /**
   * Vérifie si le service worker est enregistré
   * Note: réimplémentation de la méthode de la classe de base
   */
  static isServiceWorkerRegistered(): boolean {
    // D'abord vérifier avec la méthode de la classe de base
    const baseRegistration = super.isServiceWorkerRegistered();
    if (baseRegistration) {
      return true;
    }
    
    // Vérification supplémentaire pour les PWA mobiles
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Récupère la permission actuelle pour les notifications
   */
  static getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    
    return Notification.permission;
  }
  
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
      
      // URL de l'Edge Function Supabase (utilisation de l'URL configurée dans l'environnement)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tornfqtvnzkgnwfudxdb.supabase.co';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/fcm-proxy`;
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
            
            // Simuler une notification via le service worker
            console.log('[NOTIF DEBUG] Tentative d\'affichage d\'une notification via service worker');
            
            try {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                // Récupérer l'enregistrement du service worker actif
                const registration = await navigator.serviceWorker.ready;
                
                if (registration && registration.showNotification) {
                  await registration.showNotification('Test de notification', {
                    body: 'Ceci est un test de notification (via service worker)',
                    icon: '/favicon.ico',
                    tag: 'test-notification',
                    data: { type: 'test', timestamp: new Date().toISOString() }
                  });
                  
                  console.log('[NOTIF DEBUG] Notification via service worker affichée');
                } else {
                  console.error('[NOTIF DEBUG] L\'enregistrement du service worker n\'a pas de méthode showNotification');
                }
              } else {
                console.error('[NOTIF DEBUG] Service worker non disponible ou non contrôlé');
              }
            } catch (notifError) {
              console.error('[NOTIF DEBUG] Erreur lors de l\'affichage de la notification via service worker:', notifError);
            }
            
            // On retourne void comme attendu par la signature
            return;
          }
          
          throw initialError;
        }
      } catch (fetchError) {
        console.error('[NOTIF DEBUG] Erreur fetch:', fetchError);
        
        // En cas d'erreur, tenter de simuler une notification via le service worker
        try {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log('[NOTIF DEBUG] Erreur d\'envoi, tentative via service worker');
            
            // Récupérer l'enregistrement du service worker actif
            const registration = await navigator.serviceWorker.ready;
            
            if (registration && registration.showNotification) {
              await registration.showNotification('Test de notification', {
                body: 'Test via service worker (après erreur Edge Function)',
                icon: '/favicon.ico',
                // vibrate est supporté par l'API mais pas par le type TypeScript
                // @ts-ignore
                vibrate: [200, 100, 200],
                tag: 'error-notification',
                data: { type: 'error', timestamp: new Date().toISOString() }
              });
              
              console.log('[NOTIF DEBUG] Notification d\'erreur via service worker affichée');
              
              // Lève quand même l'erreur d'origine mais informe de la simulation
              throw new Error(`Erreur de connexion: ${fetchError instanceof Error ? fetchError.message : 'Erreur inconnue'}. Une notification via service worker a été simulée à la place.`);
            } else {
              console.error('[NOTIF DEBUG] Service worker sans méthode showNotification');
            }
          } else {
            console.error('[NOTIF DEBUG] Service worker non disponible pour notifications');
          }
        } catch (notifError) {
          console.error('[NOTIF DEBUG] Erreur lors de la notification via service worker:', notifError);
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('[NOTIF DEBUG] Erreur globale lors du test de notification:', error);
      throw error;
    }
  }
}
