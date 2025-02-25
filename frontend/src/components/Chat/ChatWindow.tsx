import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
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
}

export default function ChatWindow({ 
  conversationId, 
  guestNumber,
  propertyName,
  conversationStartTime 
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
        setMessages(current => [...current, newMessage]);
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
      if (!selectedConversation) throw new Error('Conversation non chargée');
      await Promise.all([
        MessageService.sendMessage(conversationId, content),
        WhatsAppService.sendMessage(selectedConversation.guest_phone, content)
      ]);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 800 }}>
      <ChatHeader 
        guestNumber={guestNumber}
        propertyName={propertyName}
        conversationStartTime={conversationStartTime}
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
            handleSendMessage(response);
            setAiModalOpen(false);
          }}
          onClose={() => setAiModalOpen(false)}
        />
      )}
    </Box>
  );
}
