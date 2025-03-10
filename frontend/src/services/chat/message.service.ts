import { supabase } from '../../lib/supabase';

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

  static subscribeToMessages(conversationId: string, callback: (message: Message) => void, statusCallback?: (status: string) => void) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Mise en place de la souscription pour les messages de la conversation:`, conversationId);
    
    // Créer un identifiant unique pour ce canal
    const channelId = `messages-${conversationId}-${Date.now()}`;
    
    try {
      // Utiliser un format de canal plus spécifique en suivant les meilleures pratiques de Supabase
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', {
          event: '*',  // Écouter tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, payload => {
          const receiveTimestamp = new Date().toISOString();
          console.log(`[${receiveTimestamp}] REALTIME: Événement message reçu:`, payload.eventType);
          
          // Vérifier que les données sont valides
          if (!payload.new || typeof payload.new !== 'object') {
            console.warn(`[${receiveTimestamp}] REALTIME: Données de message invalides reçues`);
            return;
          }
          
          const newMessage = payload.new as Message;
          if (!newMessage.id) {
            console.warn(`[${receiveTimestamp}] REALTIME: Message sans ID reçu`);
            return;
          }
          
          console.log(`[${receiveTimestamp}] REALTIME: Nouveau message:`, {
            id: newMessage.id,
            content: newMessage.content?.substring(0, 30) + (newMessage.content?.length > 30 ? '...' : ''),
            direction: newMessage.direction,
            created_at: newMessage.created_at
          });
          
          // Notifier le composant avec les données du message
          callback(payload.new as Message);
        })
        .subscribe(async (status) => {
          const statusTimestamp = new Date().toISOString();
          console.log(`[${statusTimestamp}] Status de la souscription messages (${channelId}):`, status);
          
          // Notifier le composant parent du statut de la connexion
          if (statusCallback) {
            statusCallback(status);
          }
          
          // En cas d'erreur de canal, tenter de récupérer les derniers messages
          if (status === 'CHANNEL_ERROR') {
            console.warn(`[${statusTimestamp}] Erreur de canal détectée, tentative de récupération des derniers messages`);
            try {
              // Récupérer les derniers messages et les envoyer via le callback
              const messages = await MessageService.getMessages(conversationId, 10);
              console.log(`[${statusTimestamp}] Récupération de secours: ${messages.length} messages récupérés`);
              
              // Envoyer uniquement les messages des 5 dernières minutes pour éviter les doublons
              const recentTime = new Date();
              recentTime.setMinutes(recentTime.getMinutes() - 5);
              
              const recentMessages = messages.filter(msg => 
                new Date(msg.created_at) > recentTime
              );
              
              if (recentMessages.length > 0) {
                console.log(`[${statusTimestamp}] Envoi de ${recentMessages.length} messages récents au composant`);
                // Envoyer les messages récents au composant
                recentMessages.forEach(msg => callback(msg));
              }
            } catch (error) {
              console.error(`[${statusTimestamp}] Échec de la récupération de secours:`, error);
            }
          }
        });
      
      // Retourner un objet avec la méthode unsubscribe
      return {
        unsubscribe: () => {
          console.log(`[${new Date().toISOString()}] Désinscription du canal ${channelId}`);
          try {
            channel.unsubscribe();
          } catch (error) {
            console.error(`Erreur lors de la désinscription du canal ${channelId}:`, error);
          }
        }
      };
    } catch (error) {
      console.error(`[${timestamp}] Erreur lors de la création de la souscription:`, error);
      // Retourner un objet factice en cas d'erreur pour éviter les erreurs dans les composants
      return {
        unsubscribe: () => console.log(`Désinscription factice pour ${channelId} (erreur à la création)`)
      };
    }
  }
}
