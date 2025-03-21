import { useState, useEffect } from 'react';
import { MessageService, Message } from '../services/chat/message.service';
import { WhatsAppService } from '../services/chat/whatsapp.service';

// Préfixe pour les logs liés à ce hook
const DEBUG_PREFIX = 'DEBUG_USE_MESSAGE_SENDER';

// Clé de base pour le stockage local des messages
const LOCAL_MESSAGES_BASE_KEY = 'airhost_local_messages';
// Alias pour compatibilité avec le code existant
const LOCAL_MESSAGES_KEY = LOCAL_MESSAGES_BASE_KEY;

// Générer une clé spécifique à une conversation
const getConversationStorageKey = (conversationId: string): string => {
  return `${LOCAL_MESSAGES_BASE_KEY}_conv_${conversationId}`;
};

export interface UseMessageSenderResult {
  sendMessage: (content: string, conversationId: string, contactId: string | undefined) => Promise<Message | null>;
  sending: boolean;
  error: string | null;
  getLocalMessages: (conversationId: string) => Message[];
}

// Exporter la fonction saveMessageLocally pour utilisation externe
export { saveMessageLocally };

// Fonction pour persister les messages localement
const saveMessageLocally = (message: Message) => {
  try {
    // S'assurer que le message a la propriété conversation_id
    if (!message.conversation_id) {
      console.error(`${DEBUG_PREFIX} Impossible de sauvegarder localement un message sans conversation_id`);
      return;
    }
    
    // Générer la clé spécifique à la conversation
    const conversationKey = getConversationStorageKey(message.conversation_id);
    console.log(`${DEBUG_PREFIX} Utilisation de la clé de stockage: ${conversationKey}`);
    
    // 1. Sauvegarder dans la clé spécifique à la conversation d'abord
    const storedConvMessages = localStorage.getItem(conversationKey);
    let convMessages: Message[] = storedConvMessages ? JSON.parse(storedConvMessages) : [];
    
    // Vérifier que le message n'existe pas déjà dans cette clé
    if (!convMessages.some(m => m.id === message.id)) {
      // Ajouter un horodatage si nécessaire
      if (!message.created_at) {
        message.created_at = new Date().toISOString();
      }
      
      convMessages.push(message);
      
      // Limiter le nombre de messages stockés (garder les 100 plus récents)
      if (convMessages.length > 100) {
        convMessages = convMessages.slice(-100);
      }
      
      // Sauvegarde immédiate et synchrone dans la clé spécifique
      localStorage.setItem(conversationKey, JSON.stringify(convMessages));
      console.log(`${DEBUG_PREFIX} Message sauvegardé localement avec clé spécifique: ID=${message.id}, Clé=${conversationKey}`);
      
      // Vérification de la sauvegarde spécifique
      const verificationConv = localStorage.getItem(conversationKey);
      if (verificationConv) {
        const savedConvMessages = JSON.parse(verificationConv) as Message[];
        const isConvSaved = savedConvMessages.some((m: Message) => m.id === message.id);
        console.log(`${DEBUG_PREFIX} Vérification de sauvegarde spécifique: le message ${message.id} est ${isConvSaved ? 'présent' : 'ABSENT !'} dans la clé ${conversationKey}`);
      }
    } else {
      console.log(`${DEBUG_PREFIX} Message déjà présent dans la clé spécifique:`, message.id);
    }
    
    // 2. Maintenir également la compatibilité avec l'ancienne méthode
    const storedGlobalMessages = localStorage.getItem(LOCAL_MESSAGES_KEY);
    let globalMessages: Message[] = storedGlobalMessages ? JSON.parse(storedGlobalMessages) : [];
    
    // Vérifier que le message n'existe pas déjà dans la clé globale
    if (!globalMessages.some(m => m.id === message.id)) {
      globalMessages.push(message);
      
      // Limiter le nombre de messages stockés (garder les 100 plus récents)
      if (globalMessages.length > 100) {
        globalMessages = globalMessages.slice(-100);
      }
      
      // Sauvegarde dans la clé globale
      localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(globalMessages));
      console.log(`${DEBUG_PREFIX} Message également sauvegardé dans la clé globale pour compatibilité: ID=${message.id}`);
    }
  } catch (error) {
    console.error(`${DEBUG_PREFIX} Erreur lors de la sauvegarde locale du message:`, error);
  }
};

// Fonction pour récupérer les messages locaux pour une conversation
const getLocalMessagesForConversation = (conversationId: string): Message[] => {
  try {
    if (!conversationId) {
      console.error(`${DEBUG_PREFIX} ID de conversation manquant pour la récupération des messages locaux`);
      return [];
    }
    
    // Clé spécifique à la conversation
    const conversationKey = getConversationStorageKey(conversationId);
    
    // Récupérer depuis la clé spécifique à la conversation
    const storedConversationMessages = localStorage.getItem(conversationKey);
    let result: Message[] = [];
    
    if (storedConversationMessages) {
      try {
        const parsedMessages = JSON.parse(storedConversationMessages) as Message[];
        console.log(`${DEBUG_PREFIX} ${parsedMessages.length} messages trouvés dans la clé spécifique ${conversationKey}`);
        result = parsedMessages;
      } catch (parseError) {
        console.error(`${DEBUG_PREFIX} Erreur de parsing pour les messages de conversation:`, parseError);
      }
    } else {
      console.log(`${DEBUG_PREFIX} Aucun message trouvé dans la clé spécifique ${conversationKey}`);
      
      // Fallback: essayer l'ancienne méthode (pour compatibilité)
      const globalStoredMessages = localStorage.getItem(LOCAL_MESSAGES_BASE_KEY);
      if (globalStoredMessages) {
        try {
          const allMessages: Message[] = JSON.parse(globalStoredMessages);
          const filteredMessages = allMessages.filter((m: Message) => m.conversation_id === conversationId);
          console.log(`${DEBUG_PREFIX} FALLBACK: ${filteredMessages.length}/${allMessages.length} messages trouvés via la clé globale`);
          result = filteredMessages;
          
          // Migration: sauvegarder ces messages dans la nouvelle clé
          if (filteredMessages.length > 0) {
            localStorage.setItem(conversationKey, JSON.stringify(filteredMessages));
            console.log(`${DEBUG_PREFIX} Migration: ${filteredMessages.length} messages migrés vers la clé spécifique`);
          }
        } catch (parseError) {
          console.error(`${DEBUG_PREFIX} Erreur de parsing pour les messages globaux:`, parseError);
        }
      } else {
        console.log(`${DEBUG_PREFIX} Aucun message trouvé dans le stockage local (ni spécifique ni global)`);
      }
    }
    
    // Log pour débogage
    if (result.length > 0) {
      // Afficher les 3 derniers messages trouvés
      const recentMessages = result.slice(-3);
      console.log(`${DEBUG_PREFIX} Derniers messages locaux:`, recentMessages.map((m: Message) => ({ 
        id: m.id, 
        conversation_id: m.conversation_id,
        created_at: m.created_at,
        content: m.content ? (m.content.substring(0, 20) + (m.content.length > 20 ? '...' : '')) : 'CONTENU MANQUANT'
      })));
    }
    
    return result;
  } catch (error) {
    console.error(`${DEBUG_PREFIX} Erreur lors de la récupération des messages locaux:`, error);
    return [];
  }
};

export function useMessageSender(): UseMessageSenderResult {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nettoyer les messages trop anciens (plus de 7 jours)
  useEffect(() => {
    try {
      // Nettoyer les messages globaux
      const storedMessages = localStorage.getItem(LOCAL_MESSAGES_KEY);
      if (storedMessages) {
        const messages: Message[] = JSON.parse(storedMessages);
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const recentMessages = messages.filter(message => {
          const messageDate = new Date(message.created_at);
          return messageDate > sevenDaysAgo;
        });
        
        if (recentMessages.length !== messages.length) {
          localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(recentMessages));
          console.log(`${DEBUG_PREFIX} Nettoyage des messages locaux anciens: ${messages.length - recentMessages.length} supprimés`);
        }
      }
      
      // Nettoyer aussi les messages par conversation
      // Liste toutes les clés du localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_MESSAGES_BASE_KEY + '_conv_')) {
          try {
            const conversationMessages = JSON.parse(localStorage.getItem(key) || '[]');
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            const recentConvMessages = conversationMessages.filter((message: Message) => {
              const messageDate = new Date(message.created_at);
              return messageDate > sevenDaysAgo;
            });
            
            if (recentConvMessages.length !== conversationMessages.length) {
              localStorage.setItem(key, JSON.stringify(recentConvMessages));
              console.log(`${DEBUG_PREFIX} Nettoyage des messages locaux pour ${key}: ${conversationMessages.length - recentConvMessages.length} supprimés`);
            }
          } catch (error) {
            console.error(`${DEBUG_PREFIX} Erreur lors du nettoyage des messages locaux pour ${key}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors du nettoyage des messages locaux:`, error);
    }
  }, []);

  // Fonction pour envoyer un message via WhatsApp et/ou le stocker en base de données
  const sendMessage = async (
    content: string,
    conversationId: string,
    contactId: string | undefined
  ): Promise<Message | null> => {
    if (!content || !conversationId) {
      setError('Contenu du message ou ID de conversation manquant');
      return null;
    }

    setSending(true);
    setError(null);
    
    try {
      console.log(`${DEBUG_PREFIX} Envoi du message à la conversation ${conversationId}`);
      
      // 1. Insérer le message dans la base de données
      const newMessage = await MessageService.sendMessage(
        conversationId,
        content,
        'text'
      );
      
      if (!newMessage) {
        throw new Error('Échec lors de l\'insertion du message');
      }
      
      console.log(`${DEBUG_PREFIX} Message inséré en base de données avec ID: ${newMessage.id}`);
      
      // Sauvegarder le message localement pour garantir qu'il soit toujours affiché
      console.log(`${DEBUG_PREFIX} Sauvegarde locale du message:`, newMessage.id);
      saveMessageLocally(newMessage);
      
      // Double vérification pour s'assurer que le message est bien sauvegardé
      setTimeout(() => {
        const localMsgs = getLocalMessagesForConversation(conversationId);
        const isPresent = localMsgs.some((m: Message) => m.id === newMessage.id);
        console.log(`${DEBUG_PREFIX} Vérification différée: le message ${newMessage.id} est ${isPresent ? 'présent' : 'ABSENT !'} dans le stockage local`);
      }, 200);
      
      // 2. Si un contactId est fourni, envoyer le message à WhatsApp
      if (contactId) {
        console.log(`${DEBUG_PREFIX} Envoi du message à WhatsApp pour le contact ${contactId}`);
        
        try {
          await WhatsAppService.sendMessage(content, contactId);
          console.log(`${DEBUG_PREFIX} Message envoyé avec succès à WhatsApp`);
        } catch (whatsappError) {
          console.error(`${DEBUG_PREFIX} Erreur lors de l'envoi à WhatsApp:`, whatsappError);
          // Ne pas bloquer le flux même si l'envoi à WhatsApp échoue
          setError('Le message a été enregistré, mais l\'envoi WhatsApp a échoué');
        }
      }
      
      return newMessage;
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors de l'envoi du message:`, error);
      setError('Erreur lors de l\'envoi du message');
      return null;
    } finally {
      setSending(false);
    }
  };

  // Fonction pour récupérer les messages locaux
  const getLocalMessages = (conversationId: string): Message[] => {
    return getLocalMessagesForConversation(conversationId);
  };

  return {
    sendMessage,
    sending,
    error,
    getLocalMessages
  };
}
