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
      
      // Appeler la fonction SQL via RPC
      const { data, error } = await supabase.rpc('process_notification_queue');
      
      if (error) {
        console.error('[NotificationProcessor] Erreur:', error);
        throw error;
      }
      
      console.log('[NotificationProcessor] Traitement terminé:', data);
      return data;
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
}
