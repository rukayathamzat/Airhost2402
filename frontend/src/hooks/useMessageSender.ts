import { useState } from 'react';
import { MessageService, Message } from '../services/chat/message.service';
import { WhatsAppService } from '../services/chat/whatsapp.service';

// Préfixe pour les logs liés à ce hook
const DEBUG_PREFIX = 'DEBUG_USE_MESSAGE_SENDER';

export interface UseMessageSenderResult {
  sendMessage: (content: string, conversationId: string, contactId: string | undefined) => Promise<Message | null>;
  sending: boolean;
  error: string | null;
}

export function useMessageSender(): UseMessageSenderResult {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return {
    sendMessage,
    sending,
    error
  };
}
