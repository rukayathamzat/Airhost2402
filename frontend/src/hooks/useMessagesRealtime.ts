import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../services/chat/message.service';

// Préfixe pour les logs liés à ce hook
const DEBUG_PREFIX = 'DEBUG_USE_MESSAGES_REALTIME';

// Intervalle de polling en ms (20 secondes)
const POLL_INTERVAL = 20000;

export interface UseMessagesRealtimeResult {
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
  const [isPollingActive, setPollingActive] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  
  // Référence pour l'intervalle de polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fonction pour mettre à jour l'état des messages avec vérification des doublons
  const updateMessagesState = (newMessages: Message[]) => {
    setMessages(current => {
      // Créer un ensemble des IDs des messages actuels pour une recherche plus efficace
      const existingIds = new Set(current.map(msg => msg.id));
      
      // Filtrer uniquement les messages qui n'existent pas déjà
      const messagesToAdd = newMessages.filter(msg => !existingIds.has(msg.id));
      
      if (messagesToAdd.length === 0) {
        console.log(`${DEBUG_PREFIX} Aucun nouveau message à ajouter`);
        return current;
      }
      
      console.log(`${DEBUG_PREFIX} Ajout de ${messagesToAdd.length} nouveaux messages`);
      
      // Combiner et trier les messages par date
      const combinedMessages = [...current, ...messagesToAdd].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Mettre à jour le compteur de messages
      if (combinedMessages.length > lastMessageCount) {
        setLastMessageCount(combinedMessages.length);
      }
      
      return combinedMessages;
    });
  };
  
  // Gestionnaire pour les nouveaux messages via Realtime
  const handleNewMessage = (newMessage: Message) => {
    const receiveTimestamp = new Date().toISOString();
    console.log(`${DEBUG_PREFIX} [${receiveTimestamp}] Nouveau message reçu via Realtime:`, newMessage);
    
    // Vérifier que le message est valide
    if (!newMessage || !newMessage.id) {
      console.warn(`${DEBUG_PREFIX} [${receiveTimestamp}] Message reçu invalide, ignoré`); 
      return;
    }
    
    // Vérifier et afficher le contenu de l'état actuel des messages pour déboguer
    console.log(`${DEBUG_PREFIX} [${receiveTimestamp}] État actuel des messages avant mise à jour:`, messages.length, 'messages');
    console.log(`${DEBUG_PREFIX} [${receiveTimestamp}] IDs des messages actuels:`, messages.map(m => m.id));
    
    // Mettre à jour la liste des messages en vérifiant les doublons
    setMessages(current => {
      // Vérifier si le message existe déjà dans la liste
      const messageExists = current.some(msg => msg.id === newMessage.id);
      
      if (messageExists) {
        console.log(`${DEBUG_PREFIX} [${receiveTimestamp}] Message déjà dans la liste, ignoré:`, newMessage.id);
        return current;
      }
      
      // Ajouter le nouveau message à la liste
      console.log(`${DEBUG_PREFIX} [${receiveTimestamp}] Ajout du nouveau message à la liste:`, newMessage.id, 'Contenu:', newMessage.content);
      
      // Créer une nouvelle liste avec le message ajouté et trier par date
      const updatedMessages = [...current, newMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      console.log(`${DEBUG_PREFIX} [${receiveTimestamp}] Nouvelle liste de messages:`, updatedMessages.length, 'messages');
      
      // Mettre à jour le compteur de messages
      setLastMessageCount(updatedMessages.length);
      
      return updatedMessages;
    });
  };
  
  // Activation du polling de fallback
  const activatePolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log(`${DEBUG_PREFIX} Activation du polling toutes les ${POLL_INTERVAL/1000} secondes`);
    
    pollingIntervalRef.current = setInterval(async () => {
      console.log(`${DEBUG_PREFIX} Exécution du polling de fallback`);
      try {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
          
        if (data) {
          updateMessagesState(data);
        }
      } catch (error) {
        console.error(`${DEBUG_PREFIX} Erreur lors du polling:`, error);
      }
    }, POLL_INTERVAL);
    
    setPollingActive(true);
  };
  
  // Désactivation du polling
  const deactivatePolling = () => {
    if (pollingIntervalRef.current) {
      console.log(`${DEBUG_PREFIX} Désactivation du polling`);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setPollingActive(false);
  };
  
  // Fonction pour forcer le rafraîchissement des messages
  const forceRefresh = async () => {
    setRefreshing(true);
    console.log(`${DEBUG_PREFIX} Rafraîchissement forcé des messages pour la conversation: ${conversationId}`);
    
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (data) {
        console.log(`${DEBUG_PREFIX} ${data.length} messages récupérés via rafraîchissement forcé`);
        
        // Afficher les premiers et derniers messages pour le débogage
        if (data.length > 0) {
          console.log(`${DEBUG_PREFIX} Premier message refresh: ${data[0]?.content}`);
          console.log(`${DEBUG_PREFIX} Dernier message refresh: ${data[data.length - 1]?.content}`);
        }
        
        updateMessagesState(data);
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors du rafraîchissement forcé:`, error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Effet pour charger les messages initiaux et configurer la souscription Realtime
  useEffect(() => {
    if (!conversationId) return;
    
    const timestamp = new Date().toISOString();
    console.log(`${DEBUG_PREFIX} [${timestamp}] Chargement des messages pour la conversation: ${conversationId}`);
    
    // Initialiser l'état de connexion
    setRealtimeStatus('CONNECTING');
    setRefreshing(true);
    
    // Charger les messages initiaux
    async function loadInitialMessages() {
      try {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
          
        console.log(`${DEBUG_PREFIX} [${timestamp}] Messages récupérés:`, data?.length);
        
        if (data) {
          // Afficher les premiers et derniers messages pour le débogage
          if (data.length > 0) {
            console.log(`${DEBUG_PREFIX} [${timestamp}] Premier message: ${data[0]?.content}`);
            console.log(`${DEBUG_PREFIX} [${timestamp}] Dernier message: ${data[data.length - 1]?.content}`);
          }
          
          setMessages(data);
          setLastMessageCount(data.length);
        }
      } catch (error) {
        console.error(`${DEBUG_PREFIX} [${timestamp}] Erreur lors du chargement des messages:`, error);
        setRealtimeStatus('ERROR');
        activatePolling(); // Activer le polling en cas d'erreur
      } finally {
        setRefreshing(false);
      }
    }
    
    loadInitialMessages();
    
    // Configurer la souscription Realtime
    try {
      console.log(`${DEBUG_PREFIX} [${timestamp}] Mise en place de la souscription realtime pour la conversation: ${conversationId}`);
      
      // Canal pour les messages
      const messagesChannel = supabase
        .channel('messages-channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, handleNewMessage)
        .subscribe((status) => {
          console.log(`${DEBUG_PREFIX} [${timestamp}] Statut du canal messages: ${status}`);
          setRealtimeStatus(status === 'SUBSCRIBED' ? 'SUBSCRIBED' : 'DISCONNECTED');
          
          // Si la souscription échoue, activer le polling
          if (status !== 'SUBSCRIBED') {
            activatePolling();
          } else {
            deactivatePolling(); // Désactiver le polling si Realtime fonctionne
          }
        });
      
      // Nettoyer les souscriptions lorsque le composant est démonté ou que l'ID change
      return () => {
        console.log(`${DEBUG_PREFIX} [${new Date().toISOString()}] Nettoyage des souscriptions pour la conversation: ${conversationId}`);
        supabase.removeChannel(messagesChannel);
        
        // Arrêter le polling si actif
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setPollingActive(false);
        }
      };
    } catch (error) {
      console.error(`${DEBUG_PREFIX} [${timestamp}] Erreur lors de la configuration de Realtime:`, error);
      // En cas d'erreur avec Realtime, activer le polling comme fallback
      setRealtimeStatus('ERROR');
      activatePolling();
    }
  }, [conversationId]);
  
  return {
    messages,
    realtimeStatus,
    refreshing,
    isPollingActive,
    forceRefresh,
    lastMessageCount
  };
}
