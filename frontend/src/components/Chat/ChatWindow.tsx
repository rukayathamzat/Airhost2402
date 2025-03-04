import { useState, useEffect } from 'react';
import { Paper } from '@mui/material';
import { supabase } from '../../lib/supabase';
import AIResponseModal from '../AIResponseModal';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import TemplateMenu from './ChatTemplates/TemplateMenu';
import WhatsAppConfig from './ChatConfig/WhatsAppConfig';
import { Message, MessageService } from '../../services/chat/message.service';
import { Template, TemplateService } from '../../services/chat/template.service';
import { WhatsAppService } from '../../services/chat/whatsapp.service';

interface ChatWindowProps {
  conversationId: string;
  guestNumber: string;
  propertyName: string;
  conversationStartTime?: string;
  isMobile?: boolean;
  onBack?: () => void;
}

export default function ChatWindow({ 
  conversationId, 
  guestNumber,
  propertyName,
  conversationStartTime,
  isMobile = false,
  onBack
}: ChatWindowProps) {
  // États
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [templateAnchorEl, setTemplateAnchorEl] = useState<null | HTMLElement>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // Chargement initial
  useEffect(() => {
    loadConversation();
    loadTemplates();
  }, [conversationId]);

  // Chargement de la conversation
  const loadConversation = async () => {
    try {
      const [conversationData, messagesData] = await Promise.all([
        supabase
          .from('conversations')
          .select('*, properties:property_id(*)')
          .eq('id', conversationId)
          .single(),
        MessageService.getMessages(conversationId)
      ]);

      if (conversationData.error) throw conversationData.error;
      setSelectedConversation(conversationData.data);
      setMessages(messagesData);
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error);
    }
  };

  // Chargement des templates
  const loadTemplates = async () => {
    try {
      const templates = await TemplateService.getTemplates();
      setTemplates(templates);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
    }
  };

  // Configuration de la subscription realtime
  useEffect(() => {
    console.log('Setting up realtime subscription for conversation:', conversationId);
    const subscription = MessageService.subscribeToMessages(
      conversationId,
      (newMessage) => {
        console.log('New message received:', newMessage);
        // Vérifier si le message n'existe pas déjà dans la liste
        setMessages(current => {
          // Si le message existe déjà (même ID), ne pas l'ajouter
          const messageExists = current.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            console.log('Message déjà dans la liste, ignoré:', newMessage.id);
            return current;
          }
          // Sinon, l'ajouter à la liste
          console.log('Ajout du nouveau message à la liste:', newMessage.id);
          return [...current, newMessage];
        });
        setIsInitialLoad(false);
      }
    );

    return () => {
      console.log('Cleaning up realtime subscription');
      subscription.unsubscribe();
    };
  }, [conversationId]);

  // Gestionnaires d'événements
  const handleSendMessage = async (content: string) => {
    try {
      console.log('Tentative d\'envoi de message:', content);
      
      if (!selectedConversation) {
        throw new Error('Conversation non chargée');
      }
      
      if (!content.trim()) {
        console.warn('Tentative d\'envoi d\'un message vide');
        return;
      }
      
      // Envoi local dans la BDD et à WhatsApp
      const [newMessage] = await Promise.all([
        MessageService.sendMessage(conversationId, content),
        WhatsAppService.sendMessage(selectedConversation.guest_phone, content)
      ]);
      
      console.log('Message envoyé avec succès:', newMessage);
      console.log('Message ID:', newMessage?.id, '- Ce message sera ajouté localement');
      
      // Si la subscription temps réel ne fonctionne pas correctement,
      // ajoutons manuellement le message à la liste
      if (newMessage) {
        setMessages(msgs => {
          // Vérifier si le message n'existe pas déjà (par sécurité)
          const messageExists = msgs.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            console.log('Message déjà présent dans la liste (manuel), pas d\'ajout');
            return msgs;
          }
          console.log('Ajout manuel du message à la liste:', newMessage.id);
          return [...msgs, newMessage];
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      // Notification d'erreur pourrait être ajoutée ici
    }
  };

  const handleSendTemplate = async (template: Template) => {
    try {
      if (!selectedConversation) throw new Error('Conversation non chargée');
      await TemplateService.sendTemplate(
        conversationId,
        selectedConversation.guest_phone,
        template
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi du template:', error);
    }
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: isMobile ? '100vh' : '100%',
        width: isMobile ? '100vw' : '100%',
        maxWidth: '100%',
        borderRadius: 0,
        overflow: 'hidden',
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 'auto',
        left: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        zIndex: isMobile ? 1000 : 1,
        m: 0,
        p: 0,
        boxSizing: 'border-box'
      }}
    >
      <ChatHeader 
        guestNumber={guestNumber}
        propertyName={propertyName}
        conversationStartTime={conversationStartTime}
        showBackButton={isMobile}
        onBack={onBack}
      />

      <ChatMessages 
        messages={messages}
        isInitialLoad={isInitialLoad}
      />

      <ChatInput 
        onSendMessage={handleSendMessage}
        onOpenAIModal={() => setAiModalOpen(true)}
        onOpenTemplates={(event: React.MouseEvent<HTMLElement>) => 
          setTemplateAnchorEl(event.currentTarget)
        }
        disabled={!selectedConversation}
      />

      <TemplateMenu 
        anchorEl={templateAnchorEl}
        onClose={() => setTemplateAnchorEl(null)}
        templates={templates}
        onSelectTemplate={handleSendTemplate}
      />

      <WhatsAppConfig 
        open={configOpen}
        onClose={() => setConfigOpen(false)}
      />

      {aiModalOpen && selectedConversation?.properties?.id && (
        <AIResponseModal
          apartmentId={selectedConversation.properties.id}
          conversationId={conversationId}
          onSend={(response: string) => {
            console.log('Réponse IA à envoyer:', response);
            // S'assurer que la réponse n'est pas vide
            if (response.trim()) {
              handleSendMessage(response);
            } else {
              console.warn('Tentative d\'envoi d\'une réponse IA vide');
            }
            setAiModalOpen(false);
          }}
          onClose={() => setAiModalOpen(false)}
        />
      )}
    </Paper>
  );
}