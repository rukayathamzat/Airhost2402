import { useState, useEffect, useRef } from 'react';
import { Paper, Box, Fab, Zoom, useTheme, Tooltip, Badge, Button, CircularProgress } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RefreshIcon from '@mui/icons-material/Refresh';
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

// Constantes pour la configuration
const DEBUG_PREFIX = 'DEBUG_CHAT_WINDOW:';
const POLL_INTERVAL = 10000; // 10 secondes

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
  
  // États pour le mécanisme de fiabilité
  const [realtimeStatus, setRealtimeStatus] = useState<string>('CONNECTING');
  const [pollingActive, setPollingActive] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastMessageCount, setLastMessageCount] = useState<number>(0);
  
  // Référence pour l'intervalle de polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Chargement initial
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Initialisation du composant`, { conversationId });
    loadConversation();
    loadTemplates();
    
    // Nettoyer le polling à la destruction du composant
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setPollingActive(false);
      }
    };
  }, [conversationId]);

  // Chargement de la conversation
  const loadConversation = async () => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`${DEBUG_PREFIX} [${timestamp}] Chargement de la conversation et des messages pour: ${conversationId}`);
      setRefreshing(true);
      
      const [conversationData, messagesData] = await Promise.all([
        supabase
          .from('conversations')
          .select('*, properties:property_id(*)')
          .eq('id', conversationId)
          .single(),
        MessageService.getMessages(conversationId)
      ]);

      if (conversationData.error) throw conversationData.error;
      
      console.log(`${DEBUG_PREFIX} [${timestamp}] Conversation chargée:`, conversationData.data.guest_name);
      console.log(`${DEBUG_PREFIX} [${timestamp}] Messages chargés:`, messagesData.length, 'messages');
      
      // Tri des messages par date de création pour garantir l'ordre chronologique
      const sortedMessages = [...messagesData].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      if (sortedMessages.length > 0) {
        console.log(`${DEBUG_PREFIX} [${timestamp}] Premier message:`, sortedMessages[0].content);
        console.log(`${DEBUG_PREFIX} [${timestamp}] Dernier message:`, sortedMessages[sortedMessages.length - 1].content);
      }
      
      setSelectedConversation(conversationData.data);
      setMessages(sortedMessages);
      setLastMessageCount(sortedMessages.length);
      
      // Mettre isInitialLoad à false après le chargement initial
      console.log(`${DEBUG_PREFIX} [${timestamp}] Initialisation terminée, désactivation de isInitialLoad`);
      setIsInitialLoad(false);
      
      // Déclencher manuellement le défilement vers le bas après le chargement
      setTimeout(scrollToBottom, 300);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors du chargement de la conversation:`, error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Forcer un rafraîchissement manuel des messages
  const forceRefresh = async () => {
    console.log(`${DEBUG_PREFIX} Rafraîchissement manuel forcé des messages`);
    await loadConversation();
    scrollToBottom();
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

  // Configuration de la subscription realtime pour les messages et système de polling de fallback
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`${DEBUG_PREFIX} [${timestamp}] Mise en place de la souscription realtime pour la conversation: ${conversationId}`);
    
    // Vérifier que l'ID de conversation est valide
    if (!conversationId) {
      console.warn(`${DEBUG_PREFIX} [${timestamp}] ID de conversation invalide, impossible de s'abonner aux messages`);
      return;
    }
    
    try {
      // S'abonner aux messages de cette conversation
      const messagesChannel = supabase
        .channel('messages-channel-' + conversationId)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          handleNewMessage(newMessage);
        })
        .subscribe(status => {
          console.log(`${DEBUG_PREFIX} [${timestamp}] Statut du canal messages:`, status);
          setRealtimeStatus(status);
          
          // Activer le polling de fallback si Realtime n'est pas SUBSCRIBED
          if (status !== 'SUBSCRIBED') {
            console.log(`${DEBUG_PREFIX} [${timestamp}] Activation du polling de fallback (Realtime: ${status})`);
            activatePolling();
          } else if (pollingActive && status === 'SUBSCRIBED') {
            console.log(`${DEBUG_PREFIX} [${timestamp}] Désactivation du polling (Realtime est SUBSCRIBED)`);
            deactivatePolling();
          }
        });
      
      // S'abonner aux mises à jour de la conversation pour le dernier message
      const conversationsChannel = supabase
        .channel('conversations-changes-' + conversationId)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, async (payload) => {
          console.log(`${DEBUG_PREFIX} [${timestamp}] Mise à jour de la conversation détectée:`, payload);
          
          // Actualiser les messages si last_message a changé
          if (payload.new && payload.old && payload.new.last_message !== payload.old.last_message) {
            console.log(`${DEBUG_PREFIX} [${timestamp}] Nouveau message détecté via mise à jour de conversation`);
            
            // Récupérer uniquement les nouveaux messages depuis le dernier chargement
            try {
              const { data: newMessages } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
                
              if (newMessages && newMessages.length > messages.length) {
                console.log(`${DEBUG_PREFIX} [${timestamp}] Nouveaux messages trouvés:`, newMessages.length - messages.length);
                
                // Mettre à jour l'état avec les nouveaux messages
                updateMessagesState(newMessages);
              }
            } catch (error) {
              console.error(`${DEBUG_PREFIX} [${timestamp}] Erreur lors de la récupération des nouveaux messages:`, error);
            }
          }
          
          // Mettre à jour l'état de la conversation
          setSelectedConversation(payload.new);
        })
        .subscribe();
      
      // Nettoyer les souscriptions lorsque le composant est démonté ou que l'ID change
      return () => {
        console.log(`${DEBUG_PREFIX} [${new Date().toISOString()}] Nettoyage des souscriptions pour la conversation: ${conversationId}`);
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(conversationsChannel);
        
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
      activatePolling();
    }
  }, [conversationId]); // Inclure conversationId comme dépendance pour recréer la souscription si l'ID change
  
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
  
  // Mettre à jour l'état des messages avec vérification des doublons
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
      
      // Mettre à jour le compteur de messages pour le défilement
      if (combinedMessages.length > lastMessageCount) {
        setLastMessageCount(combinedMessages.length);
        
        // Déclencher le défilement vers le bas si on était déjà en bas
        if (!showScrollButton) {
          setTimeout(scrollToBottom, 100);
        }
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
      
      // Force le défilement vers le bas en désactivant temporairement isInitialLoad
      setIsInitialLoad(false);
      
      // Créer une nouvelle liste avec le message ajouté et trier par date
      const updatedMessages = [...current, newMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      console.log(`${DEBUG_PREFIX} [${receiveTimestamp}] Nouvelle liste de messages:`, updatedMessages.length, 'messages');
      
      // Mettre à jour le compteur de messages
      setLastMessageCount(updatedMessages.length);
      
      // Déclencher manuellement le défilement vers le bas si on était déjà en bas
      if (!showScrollButton) {
        setTimeout(scrollToBottom, 100);
      }
      
      return updatedMessages;
    });
  };

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
        if (newMessage && newMessage.id) { // S'assurer que newMessage et son ID existent
          // Utilisons une variable const pour éviter les problèmes de type avec newMessage
          const messageToAdd = newMessage; // Cette const ne peut pas être undefined ici
          
          setMessages(msgs => {
            // Vérifier si le message n'existe pas déjà (par sécurité)
            const messageExists = msgs.some(msg => msg.id === messageToAdd.id);
            if (messageExists) {
              console.log('Message déjà présent dans la liste, pas d\'ajout');
              return msgs;
            }
            console.log('Ajout du message à la liste UI:', messageToAdd.id);
            // S'assurer que le résultat est bien de type Message[] en faisant un cast
            return [...msgs, messageToAdd] as Message[];
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
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Tentative de défilement vers le bas...`);
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      console.log(`[${timestamp}] Défilement effectué`);
    } else {
      console.warn(`[${timestamp}] Référence messagesEndRef manquante, défilement impossible`);
    }
    setUnreadCount(0);
    console.log(`[${timestamp}] Compteur de messages non lus réinitialisé`);
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
    if (messages.length > lastMessageCount && showScrollButton) {
      setUnreadCount(prev => prev + 1);
    }
  }, [messages.length, lastMessageCount, showScrollButton]);
  
  // Effet de défilement automatique lors de la première charge ou quand de nouveaux messages arrivent
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`${DEBUG_PREFIX} [${timestamp}] Effet de défilement automatique déclenché. Messages: ${messages.length}, isInitialLoad: ${isInitialLoad}, showScrollButton: ${showScrollButton}`);
    
    if (messages.length > 0) {
      // Si c'est le chargement initial, défiler vers le bas après un court délai
      if (isInitialLoad) {
        console.log(`${DEBUG_PREFIX} [${timestamp}] Programmation du défilement initial dans 300ms`);
        const timer = setTimeout(() => {
          console.log(`${DEBUG_PREFIX} [${timestamp}] Exécution du défilement initial programmé`);
          scrollToBottom();
        }, 300);
        return () => clearTimeout(timer);
      }
      // Lors de la réception d'un nouveau message, défiler vers le bas si on était déjà en bas
      else if (!showScrollButton) {
        console.log(`${DEBUG_PREFIX} [${timestamp}] Défilement automatique car déjà en bas de la conversation`);
        scrollToBottom();
      } else {
        console.log(`${DEBUG_PREFIX} [${timestamp}] Pas de défilement automatique, utilisateur n'est pas en bas de la conversation`);
      }
    } else {
      console.log(`${DEBUG_PREFIX} [${timestamp}] Pas de messages à afficher, défilement ignoré`);
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
        {/* Indicateur de l'état de la connexion Realtime */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Tooltip title={`Source des données: ${realtimeStatus === 'SUBSCRIBED' ? 'Temps réel' : 'Mode de secours'}`}>
            <Button
              size="small"
              variant="outlined"
              color={realtimeStatus === 'SUBSCRIBED' ? 'success' : 'warning'}
              startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={forceRefresh}
              sx={{ 
                minWidth: 'auto',
                padding: '4px 8px',
                fontSize: '0.7rem',
                opacity: 0.7,
                '&:hover': { opacity: 1 }
              }}
            >
              {refreshing ? 'Actualisation...' : realtimeStatus === 'SUBSCRIBED' ? 'Realtime' : 'Polling'}
            </Button>
          </Tooltip>
        </Box>
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