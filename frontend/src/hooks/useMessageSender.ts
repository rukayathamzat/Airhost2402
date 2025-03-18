import { useState, useEffect } from 'react';
import { MessageService, Message } from '../services/chat/message.service';
import { WhatsAppService } from '../services/chat/whatsapp.service';

// Préfixe pour les logs liés à ce hook
const DEBUG_PREFIX = 'DEBUG_USE_MESSAGE_SENDER';

// Clé pour le stockage local des messages
const LOCAL_MESSAGES_KEY = 'airhost_local_messages';

export interface UseMessageSenderResult {
  sendMessage: (content: string, conversationId: string, contactId: string | undefined) => Promise<Message | null>;
  sending: boolean;
  error: string | null;
  getLocalMessages: (conversationId: string) => Message[];
}

// Fonction pour persister les messages localement
const saveMessageLocally = (message: Message) => {
  try {
    // S'assurer que le message a la propriété conversation_id
    if (!message.conversation_id) {
      console.error(`${DEBUG_PREFIX} Impossible de sauvegarder localement un message sans conversation_id`);
      return;
    }
    
    // Récupérer les messages existants
    const storedMessages = localStorage.getItem(LOCAL_MESSAGES_KEY);
    let messages: Message[] = storedMessages ? JSON.parse(storedMessages) : [];
    
    // Vérifier que le message n'existe pas déjà
    if (!messages.some(m => m.id === message.id)) {
      // Ajouter un horodatage si nécessaire
      if (!message.created_at) {
        message.created_at = new Date().toISOString();
      }
      
      messages.push(message);
      
      // Limiter le nombre de messages stockés (garder les 100 plus récents)
      if (messages.length > 100) {
        messages = messages.slice(-100);
      }
      
      // Sauvegarde immédiate et synchrone
      localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
      console.log(`${DEBUG_PREFIX} Message sauvegardé localement: ID=${message.id}, Conversation=${message.conversation_id}`);
      
      // Vérification de la sauvegarde
      const verification = localStorage.getItem(LOCAL_MESSAGES_KEY);
      if (verification) {
        const savedMessages = JSON.parse(verification) as Message[];
        const isSaved = savedMessages.some((m: Message) => m.id === message.id);
        console.log(`${DEBUG_PREFIX} Vérification de sauvegarde: le message ${message.id} est ${isSaved ? 'présent' : 'ABSENT !'} dans le stockage local`);
      }
    } else {
      console.log(`${DEBUG_PREFIX} Message déjà présent dans le stockage local:`, message.id);
    }
  } catch (error) {
    console.error(`${DEBUG_PREFIX} Erreur lors de la sauvegarde locale du message:`, error);
  }
};

// Fonction pour récupérer les messages locaux pour une conversation
const getLocalMessagesForConversation = (conversationId: string): Message[] => {
  try {
    const storedMessages = localStorage.getItem(LOCAL_MESSAGES_KEY);
    if (!storedMessages) {
      console.log(`${DEBUG_PREFIX} Aucun message trouvé dans le stockage local`);
      return [];
    }
    
    const messages: Message[] = JSON.parse(storedMessages);
    const filteredMessages = messages.filter(m => m.conversation_id === conversationId);
    
    console.log(`${DEBUG_PREFIX} ${filteredMessages.length}/${messages.length} messages locaux trouvés pour la conversation ${conversationId}`);
    
    if (filteredMessages.length > 0) {
      // Afficher les 3 derniers messages trouvés (pour débogage)
      const recentMessages = filteredMessages.slice(-3);
      console.log(`${DEBUG_PREFIX} Derniers messages locaux:`, recentMessages.map((m: Message) => ({ id: m.id, content: m.content.substring(0, 20) + (m.content.length > 20 ? '...' : '') })));
    }
    
    return filteredMessages;
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
      const storedMessages = localStorage.getItem(LOCAL_MESSAGES_KEY);
      if (!storedMessages) return;
      
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
