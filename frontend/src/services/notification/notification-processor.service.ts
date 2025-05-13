import { supabase } from '../../lib/supabase';

/**
 * Service pour traiter la file d'attente des notifications
 */
export class NotificationProcessorService {
  private static processingInterval: NodeJS.Timeout | null = null;
  private static isProcessing = false;
  private static intervalTime = 60000; // 1 minute par défaut

  /**
   * Démarre le traitement périodique des notifications
   * @param intervalMs Intervalle en millisecondes (par défaut: 60000ms = 1 minute)
   */
  public static startProcessing(intervalMs = 60000): void {
    // Arrêter tout traitement existant
    this.stopProcessing();
    
    // Mettre à jour l'intervalle
    this.intervalTime = intervalMs;
    
    // Traiter immédiatement une première fois
    this.processNotificationQueue();
    
    // Configurer le traitement périodique
    this.processingInterval = setInterval(() => {
      this.processNotificationQueue();
    }, this.intervalTime);
    
    console.log(`[NotificationProcessor] Démarrage du traitement périodique (intervalle: ${intervalMs}ms)`);
  }

  /**
   * Arrête le traitement périodique des notifications
   */
  public static stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('[NotificationProcessor] Arrêt du traitement périodique');
    }
  }

  /**
   * Traite la file d'attente des notifications
   * @returns Résultat du traitement
   */
  public static async processNotificationQueue(): Promise<any> {
    // Éviter les traitements simultanés
    if (this.isProcessing) {
      console.log('[NotificationProcessor] Traitement déjà en cours, ignoré');
      return { success: false, message: 'Traitement déjà en cours' };
    }
    
    try {
      this.isProcessing = true;
      console.log('[NotificationProcessor] Début du traitement des notifications');
      
      // Récupérer les notifications en attente
      const { data: notifications, error: fetchError } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(20);
      
      if (fetchError) {
        console.error('[NotificationProcessor] Erreur lors de la récupération des notifications:', fetchError);
        throw fetchError;
      }
      
      console.log(`[NotificationProcessor] ${notifications?.length || 0} notifications à traiter`);
      
      if (!notifications || notifications.length === 0) {
        console.log('[NotificationProcessor] Aucune notification en attente');
        return { success: true, processed: 0, success_count: 0, error_count: 0 };
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      // Traiter chaque notification
      for (const notification of notifications) {
        try {
          // Appeler directement l'Edge Function fcm-proxy avec fetch au lieu de supabase.functions.invoke
          // pour éviter les problèmes CORS avec l'en-tête x-client-info
          const serviceRoleKey = await this.getServiceRoleKey();
          
          const payload = {
            to: notification.token,
            notification: {
              title: notification.title,
              body: notification.body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              tag: `message-${notification.data?.conversationId || 'general'}`,
              vibrate: [100, 50, 100]
            },
            data: notification.data || {}
          };
          
          console.log(`[NotificationProcessor] Envoi de notification à ${notification.token.substring(0, 15)}...`);
          
          const response = await fetch('https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/fcm-proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify(payload)
          });
          
          let fcmResponse, fcmError;
          
          if (response.ok) {
            fcmResponse = await response.json();
            fcmError = null;
          } else {
            fcmResponse = null;
            fcmError = {
              message: `Erreur HTTP ${response.status}: ${response.statusText}`,
              status: response.status
            };
          }
          
          // Vérifier si l'envoi a réussi
          const success = response.ok;
          
          // Mettre à jour le statut de la notification
          const { error: updateError } = await supabase
            .from('notification_queue')
            .update({
              status: success ? 'sent' : 'failed',
              processed_at: new Date().toISOString(),
              error: success ? null : (fcmError ? fcmError.message : 'Erreur inconnue')
            })
            .eq('id', notification.id);
          
          if (updateError) {
            console.error(`[NotificationProcessor] Erreur lors de la mise à jour du statut pour ${notification.id}:`, updateError);
          }
          
          // Ajouter un log
          await supabase
            .from('logs')
            .insert({
              event: 'notification_processed',
              details: {
                id: notification.id,
                success,
                response: fcmResponse || {},
                error: fcmError || null
              }
            });
          
          if (success) {
            successCount++;
            console.log(`[NotificationProcessor] ✅ Notification ${notification.id} envoyée avec succès`);
          } else {
            errorCount++;
            console.error(`[NotificationProcessor] ❌ Échec d'envoi pour ${notification.id}:`, fcmError);
          }
        } catch (err) {
          errorCount++;
          
          // Mettre à jour le statut en cas d'erreur
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
              error: err instanceof Error ? err.message : 'Erreur inconnue'
            })
            .eq('id', notification.id);
          
          // Ajouter un log d'erreur
          await supabase
            .from('logs')
            .insert({
              event: 'notification_error',
              details: {
                id: notification.id,
                error: err instanceof Error ? err.message : 'Erreur inconnue'
              }
            });
          
          console.error(`[NotificationProcessor] ❌ Erreur lors du traitement de la notification ${notification.id}:`, err);
        }
      }
      
      // Ajouter un log de résumé
      const result = {
        success: true,
        processed: successCount + errorCount,
        success_count: successCount,
        error_count: errorCount
      };
      
      await supabase
        .from('logs')
        .insert({
          event: 'notifications_batch_processed',
          details: result
        });
      
      console.log('[NotificationProcessor] Traitement terminé:', result);
      return result;
    } catch (err) {
      console.error('[NotificationProcessor] Erreur lors du traitement:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erreur inconnue' 
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Vérifie si le traitement périodique est actif
   * @returns true si le traitement est actif
   */
  public static isActive(): boolean {
    return this.processingInterval !== null;
  }

  /**
   * Récupère la clé de service Supabase pour l'authentification
   * @returns Clé de service
   */
  private static async getServiceRoleKey(): Promise<string> {
    try {
      // Utiliser directement la clé anonyme pour simplifier
      // Dans un environnement de production réel, il faudrait utiliser une fonction Edge sécurisée
      // pour récupérer la clé de service
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      if (!anonKey) {
        console.warn('[NotificationProcessor] Clé anonyme non disponible');
      }
      
      return anonKey;
    } catch (err) {
      console.error('[NotificationProcessor] Erreur lors de la récupération de la clé:', err);
      return '';
    }
  }
} 