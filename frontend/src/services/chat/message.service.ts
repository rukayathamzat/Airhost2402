import { supabase } from '../../lib/supabase';
import { NotificationService } from '../notification.service';

export interface Message {
  id: string;
  content: string;
  created_at: string;
  direction: 'inbound' | 'outbound';
  type?: 'text' | 'template';
  status?: 'sent' | 'delivered' | 'read';
}

export class MessageService {
  static async sendMessage(conversationId: string, content: string, type: 'text' | 'template' = 'text') {
    console.log('Envoi du message:', { conversationId, content, type });
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          direction: 'outbound',
          type,
          status: 'sent'
        })
        .select();

      if (error) throw error;
      
      console.log('Message envoyé avec succès:', data);
      return data[0];
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  }

  static async getMessages(conversationId: string, limit = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data as Message[];
  }

  static subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Mise en place de la souscription pour les messages de la conversation:`, conversationId);
    
    // Utiliser un format de canal plus spécifique en suivant les meilleures pratiques de Supabase
    return supabase
      .channel(`public:messages:conversation_id=eq.${conversationId}`)
      .on('postgres_changes', {
        event: '*',  // Écouter tous les événements (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        const receiveTimestamp = new Date().toISOString();
        console.log(`[${receiveTimestamp}] REALTIME: Événement message reçu:`, payload.eventType);
        console.log(`[${receiveTimestamp}] REALTIME: Nouveau message:`, payload.new);
        
        // S'assurer que les données sont valides avant de notifier les composants
        if (payload.new) {
          const message = payload.new as Message;
          callback(message);
          
          // Envoyer une notification si le message est entrant et que nous ne sommes pas sur la page de chat
          if (message.direction === 'inbound') {
            this.notifyNewMessage(message, conversationId);
          }
        }
      })
      .subscribe((status) => {
        console.log(`[${new Date().toISOString()}] Status de la souscription messages:`, status);
      });
  }
  
  /**
   * Envoie une notification pour un nouveau message
   */
  private static async notifyNewMessage(message: Message, conversationId: string) {
    try {
      console.log('[NOTIFICATION DEBUG] Tentative d\'envoi de notification pour le message:', message.id);
      
      // Vérifier si nous sommes sur la page de chat pour cette conversation
      const isOnChatPage = window.location.pathname.includes('/chat');
      const urlParams = new URLSearchParams(window.location.search);
      const currentConversationId = urlParams.get('id');
      
      console.log('[NOTIFICATION DEBUG] Localisation actuelle:', { 
        isOnChatPage, 
        pathname: window.location.pathname,
        currentConversationId, 
        messageConversationId: conversationId 
      });
      
      // Si nous sommes sur la page de chat pour cette conversation, ne pas envoyer de notification
      if (isOnChatPage && currentConversationId === conversationId) {
        console.log('[NOTIFICATION DEBUG] Sur la page de chat pour cette conversation, pas de notification');
        return;
      }
      
      // Vérifier si le service worker est enregistré
      if (!('serviceWorker' in navigator)) {
        console.warn('[NOTIFICATION DEBUG] ServiceWorker non supporté par ce navigateur');
        return;
      }
      
      // Vérifier si le service worker est actif
      const swRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
      console.log('[NOTIFICATION DEBUG] Service Worker enregistré?', !!swRegistration);
      
      // Vérifier si les notifications sont activées
      console.log('[NOTIFICATION DEBUG] Vérification si les notifications sont activées...');
      const notificationsEnabled = await NotificationService.areNotificationsEnabled();
      console.log('[NOTIFICATION DEBUG] Notifications activées?', notificationsEnabled);
      
      if (!notificationsEnabled) {
        console.log('[NOTIFICATION DEBUG] Notifications désactivées, pas d\'envoi de notification');
        // Essayer d'obtenir la permission si elle n'est pas accordée
        if (Notification.permission !== 'granted') {
          console.log('[NOTIFICATION DEBUG] Tentative d\'obtenir la permission...');
          const permissionResult = await NotificationService.requestPermission();
          console.log('[NOTIFICATION DEBUG] Résultat de la demande de permission:', permissionResult);
          if (!permissionResult) {
            return;
          }
        } else {
          return;
        }
      }
      
      // Vérifier la permission Notification
      console.log('[NOTIFICATION DEBUG] Permission Notification actuelle:', Notification.permission);
      
      // Récupérer les détails de la conversation pour le titre de la notification
      const { data: conversation } = await supabase
        .from('conversations')
        .select('guest_name')
        .eq('id', conversationId)
        .single();
      
      // Créer la notification
      const title = conversation?.guest_name || 'Nouveau message';
      const options = {
        body: message.content,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `message-${conversationId}`,  // Regrouper les notifications par conversation
        data: {
          url: `/chat?id=${conversationId}`,
          conversationId
        },
        vibrate: [100, 50, 100],
        timestamp: new Date(message.created_at).getTime()
      } as NotificationOptions;
      
      // Afficher la notification
      console.log('[NOTIFICATION DEBUG] Tentative d\'affichage de notification avec:', { 
        title, 
        options,
        notificationSupport: 'Notification' in window,
        permission: Notification.permission 
      });
      
      // Méthode 1: Utiliser l'API Notification directement
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, options);
          console.log('[NOTIFICATION DEBUG] Notification créée avec succès (API directe):', notification);
          
          notification.onclick = function() {
            console.log('[NOTIFICATION DEBUG] Notification cliquée (API directe)');
            window.focus();
            window.location.href = options.data.url;
          };
        } catch (notifError) {
          console.error('[NOTIFICATION DEBUG] Erreur lors de la création de la notification (API directe):', notifError);
        }
      } else {
        console.warn('[NOTIFICATION DEBUG] Impossible d\'afficher la notification via API directe: support=', 'Notification' in window, 'permission=', Notification.permission);
      }
      
      // Méthode 2: Utiliser le Service Worker pour afficher la notification
      if (swRegistration) {
        try {
          console.log('[NOTIFICATION DEBUG] Tentative d\'affichage via Service Worker');
          const notificationPromise = swRegistration.showNotification(title, options);
          
          notificationPromise.then(() => {
            console.log('[NOTIFICATION DEBUG] Notification affichée avec succès via Service Worker');
          }).catch(error => {
            console.error('[NOTIFICATION DEBUG] Erreur lors de l\'affichage de la notification via Service Worker:', error);
          });
        } catch (swError) {
          console.error('[NOTIFICATION DEBUG] Erreur lors de la tentative d\'affichage via Service Worker:', swError);
        }
      } else {
        console.warn('[NOTIFICATION DEBUG] Service Worker non disponible pour afficher la notification');
      }
      
      console.log(`[NOTIFICATION DEBUG] Fin du processus de notification pour le message: ${message.id}`);
    } catch (error) {
      console.error('[NOTIFICATION DEBUG] Erreur lors de l\'envoi de la notification:', error);
    }
  }
}
