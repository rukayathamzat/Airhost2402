import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Message, MessageService } from '../services/chat/message.service';
import { useMessageSender, saveMessageLocally } from './useMessageSender';
import { NotificationService } from '../services/notification/notification.service';

// Préfixe pour les logs liés à ce hook
const DEBUG_PREFIX = 'DEBUG_USE_MESSAGES_REALTIME';

// Intervalle de polling en millisecondes
const POLLING_INTERVAL = 10000; // 10 secondes
// Intervalle pour le rafraîchissement automatique forcé 
// (est utilisé plus loin dans le code pour vérifier périodiquement les nouveaux messages)
const AUTO_REFRESH_INTERVAL = 30000; // 30 secondes

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
  
  // Références pour les mécanismes de rafraîchissement spécifiques au mobile
  const mobileRefreshAttempts = useRef<number>(0);
  const mobileMessagesCache = useRef<Map<string, Message>>(new Map());
  const isMobileDevice = useRef<boolean>(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const forceMobileMode = useRef<boolean>(localStorage.getItem('force_mobile_mode') === 'true');
  
  // Fonction pour charger les messages
  const loadMessages = async (showRefreshing = true, forceNetwork = true) => {
    if (!conversationId) {
      console.error(`${DEBUG_PREFIX} ID de conversation invalide: ${conversationId}`);
      return;
    }
    
    if (showRefreshing) {
      setRefreshing(true);
    }
    
    const timestamp = new Date().toISOString();
    console.log(`${DEBUG_PREFIX} [${timestamp}] Chargement des messages pour la conversation: ${conversationId}, forceNetwork: ${forceNetwork}`);
    
    try {
      // 1. Récupérer les messages stockés localement d'abord
      // (pour s'assurer qu'ils sont toujours disponibles)
      const localMessages = getLocalMessages(conversationId);
      console.log(`${DEBUG_PREFIX} [${timestamp}] ${localMessages.length} messages récupérés depuis le stockage local`);
      
      let combinedMessages = [...localMessages];
      
      try {
        // 2. Récupérer les messages depuis la base de données
        // Force le rechargement complet en utilisant un AbortController pour éviter le cache
        const fetchedMessages = await MessageService.getMessages(conversationId, forceNetwork as boolean);
        console.log(`${DEBUG_PREFIX} [${timestamp}] ${fetchedMessages.length} messages récupérés depuis la BDD`);
        
        // Afficher les derniers messages récupérés pour débogage
        if (fetchedMessages.length > 0) {
          const latestMessages = fetchedMessages.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 3);
          
          console.log(`${DEBUG_PREFIX} [${timestamp}] Derniers messages récupérés:`, 
            latestMessages.map(m => ({
              id: m.id,
              content: m.content ? (m.content.substring(0, 20) + '...') : 'CONTENU MANQUANT',
              created_at: m.created_at
            }))
          );
        }
        
        // Ajouter les messages de la BDD à la liste combinée
        combinedMessages = [...combinedMessages, ...fetchedMessages];
      } catch (dbError) {
        // En cas d'erreur avec la base de données, on continue avec les messages locaux
        console.error(`${DEBUG_PREFIX} [${timestamp}] Erreur lors de la récupération depuis la BDD, utilisation des messages locaux uniquement:`, dbError);
      }
      
      console.log(`${DEBUG_PREFIX} [${timestamp}] ${combinedMessages.length} messages combinés avant déduplication`);
      
      // Assurer l'unicité des messages
      const uniqueMessages = deduplicateMessages(combinedMessages);
      console.log(`${DEBUG_PREFIX} [${timestamp}] ${uniqueMessages.length} messages uniques après déduplication`);
      
      // Trier les messages par date de création
      const sortedMessages = [...uniqueMessages].sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      // Détection des messages manquants ou différents par rapport à l'état précédent
      if (messages.length > 0 && sortedMessages.length !== messages.length) {
        console.log(`${DEBUG_PREFIX} [${timestamp}] Différence détectée dans le nombre de messages: ${messages.length} -> ${sortedMessages.length}`);
        
        // Afficher les messages potentiellement ajoutés ou supprimés
        if (sortedMessages.length > messages.length) {
          const newIds = new Set(sortedMessages.map(m => m.id));
          const existingIds = new Set(messages.map(m => m.id));
          const addedMessageIds = [...newIds].filter(id => !existingIds.has(id));
          
          console.log(`${DEBUG_PREFIX} [${timestamp}] Messages ajoutés: ${addedMessageIds.join(', ')}`);
        }
      }
      
      // Spécifique mobile: s'assurer que les messages sont correctement mis à jour
      if (isMobileDevice.current || forceMobileMode.current) {
        // Ceci est critique pour les appareils mobiles: force un nouveau tableau
        // pour garantir que React détecte le changement
        console.log(`${DEBUG_PREFIX} [${timestamp}] [MOBILE] Application du traitement spécifique mobile`);
        
        // Sauvegarder en cache les messages pour pouvoir les restaurer si nécessaire
        sortedMessages.forEach(msg => {
          mobileMessagesCache.current.set(msg.id, { ...msg });
        });
        
        // Forcer la mise à jour en créant un nouveau tableau
        const mobileMessages = [...sortedMessages];
        
        // Forcer un délai pour s'assurer que le rendu se fait après l'update du DOM
        setTimeout(() => {
          setMessages(mobileMessages);
          console.log(`${DEBUG_PREFIX} [${timestamp}] [MOBILE] État des messages mis à jour avec délai`);
          
          // Incrémenter le compteur de tentatives
          mobileRefreshAttempts.current += 1;
          
          // Si on est à moins de 3 tentatives, programmer un nouveau rafraîchissement
          if (mobileRefreshAttempts.current < 3) {
            console.log(`${DEBUG_PREFIX} [${timestamp}] [MOBILE] Programmation d'un rafraîchissement supplémentaire (tentative ${mobileRefreshAttempts.current})`);
            setTimeout(() => {
              // Forcer un nouveau rendu avec les mêmes données mais une référence différente
              const refreshedMessages = sortedMessages.map(msg => ({ ...msg }));
              setMessages(refreshedMessages);
            }, 800 * mobileRefreshAttempts.current);
          }
        }, 50);
      } else {
        // Comportement standard pour les autres appareils
        setMessages(sortedMessages);
      }
      
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
    
    // Log supplémentaire pour détecter si nous sommes sur mobile
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log(`${DEBUG_PREFIX} [${timestamp}] Environnement détecté: ${isMobileDevice ? 'Mobile' : 'Desktop'}`);
    
    if (payload.new) {
      const newMessage = payload.new as Message;
      
      // Vérifier si le message appartient à la conversation active
      if (payload.new.conversation_id === conversationId) {
        console.log(`${DEBUG_PREFIX} [${timestamp}] Ajout du nouveau message à la conversation - ID: ${newMessage.id}, Created: ${newMessage.created_at}`);
        console.log(`${DEBUG_PREFIX} [${timestamp}] Contenu du message: ${newMessage.content?.substring(0, 50)}${newMessage.content && newMessage.content.length > 50 ? '...' : ''}`);
        
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
          
          // Sauvegarder le message localement
          try {
            // Utiliser la fonction importée en haut du fichier
            saveMessageLocally(newMessage);
            console.log(`${DEBUG_PREFIX} [${timestamp}] Message également sauvegardé localement via Realtime`);
            
            // Déclencher une notification UNIQUEMENT pour les messages entrants
            // et seulement si le message n'a pas été envoyé par l'utilisateur actuel
            if (newMessage.direction === 'inbound') {
              console.log(`${DEBUG_PREFIX} [${timestamp}] Message entrant détecté, déclenchement de la notification`);
              // Ajouter un attribut spécial pour le suivi des notifications
              const messageWithFlag = {
                ...newMessage,
                _notificationTracking: {
                  source: 'useMessagesRealtime',
                  timestamp: new Date().toISOString()
                }
              };
              NotificationService.notifyNewMessage(messageWithFlag);
            } else {
              console.log(`${DEBUG_PREFIX} [${timestamp}] Message sortant, pas de notification`);
            }
          } catch (error) {
            console.error(`${DEBUG_PREFIX} [${timestamp}] Erreur lors de la sauvegarde locale du message reçu:`, error);
          }
          
          return updatedMessages;
        });
        
        // Force un rafraîchissement après réception d'un message Realtime pour s'assurer que tout est synchronisé
        // Délai plus court pour mobile pour assurer une synchronisation plus rapide
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const refreshDelay = isMobileDevice ? 300 : 1000; // Plus rapide sur mobile
        
        setTimeout(() => {
          console.log(`${DEBUG_PREFIX} [${timestamp}] Rafraîchissement après réception d'un message Realtime (${isMobileDevice ? 'Mobile' : 'Desktop'})`);
          // Forcer un rafraîchissement complet avec priorité réseau pour les appareils mobiles
          loadMessages(false, true); // Ne pas montrer l'icône de chargement
          
          // Sur mobile, forcez un second rafraîchissement pour plus de fiabilité
          if (isMobileDevice) {
            setTimeout(() => {
              console.log(`${DEBUG_PREFIX} [${timestamp}] Second rafraîchissement pour mobile`);
              loadMessages(false, true);
            }, 1000);
          }
        }, refreshDelay);
      } else {
        console.log(`${DEBUG_PREFIX} [${timestamp}] Message ignoré car il n'appartient pas à la conversation active: ${payload.new.conversation_id} !== ${conversationId}`);
      }
    }
  };
  
  // Fonction pour rafraîchir manuellement les messages
  const forceRefresh = async () => {
    console.log(`${DEBUG_PREFIX} Rafraîchissement manuel des messages`);
    await loadMessages(true, true);
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
      loadMessages(false, true); // Force une requête réseau fraîche à chaque polling
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
    
    // Charger les messages initiaux avec une requête fraîche
    loadMessages(true, true);
    
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
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log(`${DEBUG_PREFIX} useEffect déclenché avec conversationId: ${conversationId}, environnement: ${isMobileDevice ? 'Mobile' : 'Desktop'}`);
    
    if (!conversationId) {
      console.error(`${DEBUG_PREFIX} ID de conversation invalide, impossible de configurer Realtime`);
      return;
    }
    
    setRealtimeStatus('CONNECTING');
    
    // Référence pour le rafraîchissement automatique
    let autoRefreshInterval: NodeJS.Timeout | null = null;

    // Configurer Realtime et charger les messages initiaux
    setupRealtimeAndInitialLoad();
    
    // Configurer un rafraîchissement périodique (toutes les 30 secondes)
    autoRefreshInterval = setInterval(() => {
      console.log(`${DEBUG_PREFIX} Rafraîchissement automatique périodique des messages`);
      loadMessages(false, true); // Force une requête fraîche sans montrer l'indicateur de chargement
    }, AUTO_REFRESH_INTERVAL);
    
    // Gestionnaire pour les messages du service worker (spécifique mobile)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const timestamp = new Date().toISOString();
      
      if (event.data && (event.data.type === 'FORCE_REFRESH' || event.data.type === 'NEW_MESSAGE')) {
        console.log(`${DEBUG_PREFIX} [${timestamp}] [MOBILE] Message reçu du service worker:`, event.data.type, event.data);
        
        // Vérifier si le message concerne la conversation actuelle
        const payload = event.data.payload;
        // Compatibilité avec différents formats de messages
        const messageConversationId = payload?.conversation_id || payload?.conversationId;
        
        if (messageConversationId === conversationId || !messageConversationId) {
          console.log(`${DEBUG_PREFIX} [${timestamp}] [MOBILE] Rafraîchissement forcé pour la conversation: ${conversationId}`);
          
          // Forcer un rafraîchissement immédiat
          loadMessages(false, true);
          
          // Programmer plusieurs rafraîchissements avec délais variables pour s'assurer de la synchronisation complète
          [1000, 3000, 7000].forEach(delay => {
            setTimeout(() => {
              console.log(`${DEBUG_PREFIX} [${timestamp}] [MOBILE] Rafraîchissement #${delay/1000} après message du service worker`);
              loadMessages(false, true);
            }, delay);
          });
          
          // Confirmer la réception et le traitement au service worker si possible
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'MESSAGE_PROCESSED',
              conversationId,
              timestamp: Date.now()
            });
          }
        } else {
          console.log(`${DEBUG_PREFIX} [${timestamp}] [MOBILE] Message ignoré car il ne concerne pas la conversation actuelle`);
        }
      }
    };
    
    // Enregistrer le gestionnaire de messages du service worker
    if (isMobileDevice && navigator.serviceWorker) {
      console.log(`${DEBUG_PREFIX} [MOBILE] Enregistrement du gestionnaire de messages du service worker`);
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      // Informer le service worker que le client est prêt à recevoir des messages
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLIENT_READY',
          conversationId: conversationId,
          timestamp: Date.now()
        });
        console.log(`${DEBUG_PREFIX} [MOBILE] Notification au service worker: client prêt`);
      }
    }
    
    // Nettoyage
    return () => {
      console.log(`${DEBUG_PREFIX} Nettoyage: désinscription du canal Realtime, arrêt du polling et du rafraîchissement automatique`);
      
      if (messagesChannelRef.current) {
        messagesChannelRef.current.unsubscribe();
        messagesChannelRef.current = null;
      }
      
      // Arrêter le polling
      stopPolling();
      
      // Arrêter le rafraîchissement automatique
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log(`${DEBUG_PREFIX} Arrêt du rafraîchissement automatique`);  
      }
      
      // Supprimer l'écouteur d'événements du service worker
      if (isMobileDevice && navigator.serviceWorker) {
        console.log(`${DEBUG_PREFIX} [MOBILE] Suppression du gestionnaire de messages du service worker`);
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
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
