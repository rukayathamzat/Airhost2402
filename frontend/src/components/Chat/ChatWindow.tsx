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
      
      // Mettre isInitialLoad à false après le chargement initial
      setIsInitialLoad(false);
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

  // Configuration de la subscription realtime pour les messages
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Mise en place de la souscription realtime pour la conversation: ${conversationId}`);
    
    // Vérifier que l'ID de conversation est valide
    if (!conversationId) {
      console.warn(`[${timestamp}] ID de conversation invalide, impossible de s'abonner aux messages`);
      return;
    }
    
    // S'abonner aux messages de cette conversation
    const subscription = MessageService.subscribeToMessages(
      conversationId,
      (newMessage) => {
        const receiveTimestamp = new Date().toISOString();
        console.log(`[${receiveTimestamp}] Nouveau message reçu:`, newMessage);
        
        // Vérifier que le message est valide
        if (!newMessage || !newMessage.id) {
          console.warn(`[${receiveTimestamp}] Message reçu invalide, ignoré`); 
          return;
        }
        
        // Mettre à jour la liste des messages en vérifiant les doublons
        setMessages(current => {
          // Vérifier si le message existe déjà dans la liste
          const messageExists = current.some(msg => msg.id === newMessage.id);
          
          if (messageExists) {
            console.log(`[${receiveTimestamp}] Message déjà dans la liste, ignoré:`, newMessage.id);
            return current;
          }
          
          // Ajouter le nouveau message à la liste
          console.log(`[${receiveTimestamp}] Ajout du nouveau message à la liste:`, newMessage.id);
          // Marquer comme non chargement initial pour activer le défilement automatique
          setIsInitialLoad(false);
          return [...current, newMessage];
        });
      }
    );

    // Nettoyer la souscription lorsque le composant est démonté ou que l'ID change
    return () => {
      console.log(`[${new Date().toISOString()}] Nettoyage de la souscription realtime pour la conversation: ${conversationId}`);
      subscription.unsubscribe();
    };
  }, [conversationId]); // Inclure conversationId comme dépendance pour recréer la souscription si l'ID change

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
      
      // Étape 1: Insérer le message en base et mettre à jour l'UI immédiatement
      let newMessage: Message | undefined;
      try {
        newMessage = await MessageService.sendMessage(conversationId, content);
        console.log('Message inséré avec succès dans la base:', newMessage);
        
        // Ajouter immédiatement le message à l'UI
        if (newMessage) {
          setMessages(msgs => {
            // Vérifier si le message n'existe pas déjà (par sécurité)
            const messageExists = msgs.some(msg => msg.id === newMessage.id);
            if (messageExists) {
              console.log('Message déjà présent dans la liste, pas d\'ajout');
              return msgs;
            }
            console.log('Ajout du message à la liste UI:', newMessage.id);
            return [...msgs, newMessage];
          });
          
          // Défiler automatiquement vers le bas après l'ajout du message
          setTimeout(scrollToBottom, 100);
        }
      } catch (dbError) {
        console.error('Erreur lors de l\'insertion du message dans la base:', dbError);
        throw dbError; // Remonter l'erreur pour arrêter l'exécution
      }
      
      // Étape 2: Envoyer le message via WhatsApp (même si l'étape échoue, le message est déjà affiché)
      try {
        await WhatsAppService.sendMessage(selectedConversation.guest_phone, content);
        console.log('Message envoyé avec succès à WhatsApp');
      } catch (whatsappError) {
        console.error('Erreur lors de l\'envoi du message à WhatsApp:', whatsappError);
        // On pourrait ajouter une notification pour informer l'utilisateur que le message
        // n'a pas été envoyé à WhatsApp, mais est bien enregistré localement
        // TODO: Ajouter un toast ou une notification visuelle
      }
    } catch (error) {
      console.error('Erreur générale lors de l\'envoi du message:', error);
      // Notification d'erreur générale pourrait être ajoutée ici
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
  
  // Effet de défilement automatique lors de la première charge ou quand de nouveaux messages arrivent
  useEffect(() => {
    if (messages.length > 0) {
      // Si c'est le chargement initial, défiler vers le bas après un court délai
      if (isInitialLoad) {
        const timer = setTimeout(scrollToBottom, 300);
        return () => clearTimeout(timer);
      }
      // Lors de la réception d'un nouveau message, défiler vers le bas si on était déjà en bas
      else if (!showScrollButton) {
        scrollToBottom();
      }
    }
  }, [messages.length, isInitialLoad, showScrollButton]);

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
          onSendMessage={handleSendMessage}
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

      {/* Modals et configurations */}

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