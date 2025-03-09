import { useState, useEffect, useRef } from 'react';
import { Paper, Box, Fab, Zoom, useTheme, Tooltip, Badge } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { supabase } from '../../lib/supabase';
import AIResponseModal from '../AIResponseModal';
// ChatHeader supprimé pour optimiser l'interface
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import TemplateMenu from './ChatTemplates/TemplateMenu';
import WhatsAppConfig from './ChatConfig/WhatsAppConfig';
import { Message, MessageService } from '../../services/chat/message.service';
import { Template, TemplateService } from '../../services/chat/template.service';
import { WhatsAppService } from '../../services/chat/whatsapp.service';

interface ChatWindowProps {
  conversationId: string;
  isMobile?: boolean;
  // Les props suivantes sont temporairement commentées car inutilisées
  // guestNumber: string;
  // conversationStartTime?: string;
  // onBack?: () => void;
}

export default function ChatWindow({ 
  conversationId, 
  isMobile = false,
  // Les props suivantes sont temporairement commentées car inutilisées
  // guestNumber,
  // conversationStartTime,
  // onBack
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
  const handleSendMessage = async (content: string): Promise<void> => {
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

  // Référence pour le défilement vers le bas
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const theme = useTheme();

  // Fonction pour faire défiler vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
  };

  // Gestion du défilement
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 50;
    setShowScrollButton(!isAtBottom);
    
    if (isAtBottom) {
      setUnreadCount(0);
    }
  };

  // Mise à jour du compteur non lu quand un nouveau message arrive et qu'on n'est pas en bas
  useEffect(() => {
    if (messages.length > 0 && showScrollButton) {
      setUnreadCount(prev => prev + 1);
    }
  }, [messages.length]);

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: isMobile ? 'calc(100vh - 56px)' : '100%', // Ajustement pour tenir compte de la AppBar en mode mobile
        width: '100%',
        maxWidth: '100%',
        borderRadius: 0,
        overflow: 'hidden',
        position: 'relative',
        m: 0,
        p: 0,
        boxSizing: 'border-box',
        bgcolor: theme.palette.mode === 'dark' ? '#121212' : '#f5f7f9'
      }}
    >
      {/* Composant ChatHeader supprimé pour optimiser l'interface */}

      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          py: 2,
          px: { xs: 1.5, sm: 2.5 },
          backgroundImage: theme.palette.mode === 'dark' 
            ? 'linear-gradient(rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
            : 'linear-gradient(rgba(224, 242, 254, 0.5) 0%, rgba(186, 230, 253, 0.4) 100%)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          height: 'calc(100vh - 170px)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
        onScroll={handleScroll}
      >
        <ChatMessages 
          messages={messages}
          isInitialLoad={isInitialLoad}
        />
        <div ref={messagesEndRef} style={{ height: 1 }} />
      </Box>

      {/* Bouton de défilement vers le bas */}
      <Zoom in={showScrollButton}>
        <Tooltip title="Nouveaux messages">
          <Fab 
            color="primary" 
            size="small" 
            onClick={scrollToBottom}
            sx={{ 
              position: 'absolute', 
              bottom: 80, 
              right: 16,
              zIndex: 2,
              boxShadow: 3
            }}
          >
            <Badge 
              badgeContent={unreadCount > 0 ? unreadCount : null}
              color="error"
              max={99}
            >
              <KeyboardArrowDownIcon />
            </Badge>
          </Fab>
        </Tooltip>
      </Zoom>

      <Box sx={{ 
        borderTop: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        bgcolor: theme.palette.background.paper,
        px: 2,
        py: 1.5
      }}>
        <ChatInput 
          onSendMessage={async (content) => {
            await handleSendMessage(content);
            // Défiler automatiquement vers le bas après l'envoi d'un message
            setTimeout(scrollToBottom, 100);
          }}
          onOpenAIModal={() => setAiModalOpen(true)}
          onOpenTemplates={(event: React.MouseEvent<HTMLElement>) => 
            setTemplateAnchorEl(event.currentTarget)
          }
          disabled={!selectedConversation}
        />
      </Box>

      <TemplateMenu
        anchorEl={templateAnchorEl}
        open={Boolean(templateAnchorEl)}
        onClose={() => setTemplateAnchorEl(null)}
        templates={templates}
        onSelectTemplate={(template) => {
          handleSendTemplate(template);
          setTemplateAnchorEl(null);
          // Défiler automatiquement vers le bas après l'envoi d'un template
          setTimeout(scrollToBottom, 100);
        }}
      />

      <WhatsAppConfig 
        open={configOpen}
        onClose={() => setConfigOpen(false)}
      />

      {/* Effet de défilement automatique lors de la première charge */}
      {isInitialLoad && messages.length > 0 && (
        <Box sx={{ display: 'none' }}>
          {null /* Utiliser useEffect au lieu de setTimeout directement dans le JSX */}
        </Box>
      )}
      
      {/* Effet de défilement automatique */}
      {useEffect(() => {
        if (isInitialLoad && messages.length > 0) {
          const timer = setTimeout(scrollToBottom, 300);
          return () => clearTimeout(timer);
        }
      }, [isInitialLoad, messages.length])}

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