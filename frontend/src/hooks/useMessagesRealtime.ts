import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Message, MessageService } from '../services/chat/message.service';
import { useMessageSender } from './useMessageSender';

// Préfixe pour les logs liés à ce hook
const DEBUG_PREFIX = 'DEBUG_USE_MESSAGES_REALTIME';

// Intervalle de polling en millisecondes
const POLLING_INTERVAL = 10000; // 10 secondes

interface UseMessagesRealtimeResult {
  messages: Message[];
  realtimeStatus: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
  refreshing: boolean;
  isPollingActive: boolean;
  forceRefresh: () => Promise<void>;
  lastMessageCount: number;
}

export function useMessagesRealtime(conversationId: string): UseMessagesRealtimeResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR'>('CONNECTING');
  const [refreshing, setRefreshing] = useState(false);
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesChannelRef = useRef<any>(null);
  const { getLocalMessages } = useMessageSender();
  
  // Fonction pour charger les messages
  const loadMessages = async (showRefreshing = true) => {
    if (!conversationId) {
      console.error(`${DEBUG_PREFIX} ID de conversation invalide: ${conversationId}`);
      return;
    }
    
    if (showRefreshing) {
      setRefreshing(true);
    }
    
    const timestamp = new Date().toISOString();
    console.log(`${DEBUG_PREFIX} [${timestamp}] Chargement des messages pour la conversation: ${conversationId}`);
    
    try {
      // Récupérer les messages depuis la base de données
      const fetchedMessages = await MessageService.getMessages(conversationId);
      console.log(`${DEBUG_PREFIX} [${timestamp}] ${fetchedMessages.length} messages récupérés depuis la BDD`);
      
      // Récupérer les messages stockés localement
      const localMessages = getLocalMessages(conversationId);
      console.log(`${DEBUG_PREFIX} [${timestamp}] ${localMessages.length} messages récupérés depuis le stockage local`);
      
      // Combiner les messages
      const combinedMessages = [...fetchedMessages, ...localMessages];
      console.log(`${DEBUG_PREFIX} [${timestamp}] ${combinedMessages.length} messages combinés avant déduplication`);
      
      // Assurer l'unicité des messages
      const uniqueMessages = deduplicateMessages(combinedMessages);
      console.log(`${DEBUG_PREFIX} [${timestamp}] ${uniqueMessages.length} messages uniques après déduplication`);
      
      // Trier les messages par date de création
      const sortedMessages = [...uniqueMessages].sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      setMessages(sortedMessages);
      setLastMessageCount(sortedMessages.length);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} [${timestamp}] Erreur lors du chargement des messages:`, error);
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      }
    }
  };
  
  // Fonction pour dédupliquer les messages
  const deduplicateMessages = (messages: Message[]): Message[] => {
    const uniqueMap = new Map();
    messages.forEach(message => {
      uniqueMap.set(message.id, message);
    });
    return Array.from(uniqueMap.values());
  };
  
  // Gestionnaire pour les nouveaux messages
  const handleNewMessage = (payload: any) => {
    const timestamp = new Date().toISOString();
    console.log(`${DEBUG_PREFIX} [${timestamp}] Nouveau message détecté via Realtime:`, payload);
    
    if (payload.new) {
      const newMessage = payload.new as Message;
      
      // Vérifier si le message appartient à la conversation active
      if (payload.new.conversation_id === conversationId) {
        console.log(`${DEBUG_PREFIX} [${timestamp}] Ajout du nouveau message à la conversation`);
        
        // Mettre à jour l'état des messages en évitant les doublons
        setMessages(prevMessages => {
          // Vérifier si le message existe déjà
          const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
          
          if (messageExists) {
            console.log(`${DEBUG_PREFIX} [${timestamp}] Message déjà présent dans l'état`);
            return prevMessages;
          }
          
          // Ajouter le nouveau message et trier
          const updatedMessages = [...prevMessages, newMessage].sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          
          console.log(`${DEBUG_PREFIX} [${timestamp}] État mis à jour: ${updatedMessages.length} messages`);
          return updatedMessages;
        });
      } else {
        console.log(`${DEBUG_PREFIX} [${timestamp}] Message ignoré car il n'appartient pas à la conversation active`);
      }
    }
  };
  
  // Fonction pour rafraîchir manuellement les messages
  const forceRefresh = async () => {
    console.log(`${DEBUG_PREFIX} Rafraîchissement manuel des messages`);
    await loadMessages(true);
  };
  
  // Fonction pour démarrer le polling
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log(`${DEBUG_PREFIX} Démarrage du polling tous les ${POLLING_INTERVAL / 1000} secondes`);
    setIsPollingActive(true);
    
    pollingIntervalRef.current = setInterval(() => {
      console.log(`${DEBUG_PREFIX} Exécution du polling`);
      loadMessages(false);
    }, POLLING_INTERVAL);
  };
  
  // Fonction pour arrêter le polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log(`${DEBUG_PREFIX} Arrêt du polling`);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPollingActive(false);
    }
  };
  
  // Fonction pour charger les messages initiaux et configurer Realtime
  const setupRealtimeAndInitialLoad = () => {
    const timestamp = new Date().toISOString();
    console.log(`${DEBUG_PREFIX} [${timestamp}] Configuration de Realtime et chargement initial des messages`);
    
    // Charger les messages initiaux
    loadMessages();
    
    // Configurer la souscription Realtime
    try {
      console.log(`${DEBUG_PREFIX} [${timestamp}] Mise en place de la souscription realtime pour la conversation: ${conversationId}`);
      
      // Canal pour les messages
      const messagesChannel = supabase
        .channel('messages-channel')
        .on(
          'postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          }, 
          handleNewMessage
        )
        .subscribe((status) => {
          console.log(`${DEBUG_PREFIX} [${timestamp}] Statut du canal messages: ${status}`);
          setRealtimeStatus(status === 'SUBSCRIBED' ? 'SUBSCRIBED' : 'DISCONNECTED');
          
          // Si la souscription échoue, activer le polling
          if (status !== 'SUBSCRIBED') {
            console.log(`${DEBUG_PREFIX} [${timestamp}] La souscription Realtime a échoué, activation du polling`);
            startPolling();
          } else {
            // Si la souscription réussit, arrêter le polling
            stopPolling();
          }
        });
      
      messagesChannelRef.current = messagesChannel;
      
    } catch (error) {
      console.error(`${DEBUG_PREFIX} [${timestamp}] Erreur lors de la configuration de Realtime:`, error);
      setRealtimeStatus('ERROR');
      
      // En cas d'erreur, activer le polling
      startPolling();
    }
  };
  
  // Effet pour configurer Realtime et charger les messages initiaux
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} useEffect déclenché avec conversationId:`, conversationId);
    
    if (!conversationId) {
      console.error(`${DEBUG_PREFIX} ID de conversation invalide, impossible de configurer Realtime`);
      return;
    }
    
    setRealtimeStatus('CONNECTING');
    
    // Configurer Realtime et charger les messages initiaux
    setupRealtimeAndInitialLoad();
    
    // Nettoyage
    return () => {
      console.log(`${DEBUG_PREFIX} Nettoyage: désinscription du canal Realtime et arrêt du polling`);
      
      if (messagesChannelRef.current) {
        messagesChannelRef.current.unsubscribe();
      }
      
      stopPolling();
    };
  }, [conversationId]);
  
  // Retourner l'état et les fonctions
  return {
    messages,
    realtimeStatus,
    refreshing,
    isPollingActive,
    forceRefresh,
    lastMessageCount
  };
}
