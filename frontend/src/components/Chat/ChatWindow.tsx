import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Card, 
  Typography, 
  Divider,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Fab,
  Zoom,
  Badge,
  Tooltip,
  Paper,
  useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularConnectedNoInternet0BarIcon from '@mui/icons-material/SignalCellularConnectedNoInternet0Bar';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import PaletteIcon from '@mui/icons-material/Palette';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import AIResponseModal from '../AIResponseModal';
import { useMessagesRealtime } from '../../hooks/useMessagesRealtime';
import { useMessageSender } from '../../hooks/useMessageSender';
import { useTemplates, Template } from '../../hooks/useTemplates';

// Préfixe pour les logs liés à ce composant
const DEBUG_PREFIX = 'DEBUG_CHAT_WINDOW';

interface ChatWindowProps {
  conversationId: string;
  whatsappContactId?: string;
  guestName?: string;
  isMobile?: boolean;
  apartmentId?: string; // ID de l'appartement pour les requêtes IA
  onBack?: () => void; // Fonction pour revenir à la liste des conversations (utile en mobile)
}

export default function ChatWindow({ 
  conversationId, 
  whatsappContactId, 
  guestName, 
  isMobile = false, 
  apartmentId,
  onBack
}: ChatWindowProps) {
  // États locaux
  const [messageInput, setMessageInput] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [templatesMenuAnchorEl, setTemplatesMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Référence pour le défilement vers le bas
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messagesContainerRef = useRef<null | HTMLDivElement>(null);
  
  // Thème
  const theme = useTheme();
  
  // Utilisation des hooks personnalisés
  const { 
    messages, 
    realtimeStatus, 
    refreshing, 
    isPollingActive, 
    forceRefresh 
  } = useMessagesRealtime(conversationId);
  
  const { sendMessage, sending, error: sendError } = useMessageSender();
  const { templates } = useTemplates();
  
  // Fonction pour faire défiler vers le bas
  const scrollToBottom = (instant = false) => {
    console.log(`${DEBUG_PREFIX} Tentative de défilement vers le bas, instant: ${instant}`);
    try {
      messagesEndRef.current?.scrollIntoView({
        behavior: instant ? 'auto' : 'smooth',
        block: 'end'
      });
      setUnreadCount(0);
      console.log(`${DEBUG_PREFIX} Défilement exécuté`);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors du défilement:`, error);
    }
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
  }, [messages.length, showScrollButton]);
  
  // Gestionnaire pour l'envoi de message
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;
    
    try {
      console.log(`${DEBUG_PREFIX} Envoi du message: ${messageInput}`);
      const sentMessage = await sendMessage(
        messageInput,
        conversationId,
        whatsappContactId
      );
      
      if (sentMessage) {
        console.log(`${DEBUG_PREFIX} Message envoyé avec succès:`, sentMessage);
        setMessageInput('');
        // Défiler automatiquement vers le bas après l'envoi
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors de l'envoi du message:`, error);
    }
  }, [messageInput, conversationId, whatsappContactId, sendMessage]);
  
  // Gestionnaire pour la sélection d'un template
  const handleTemplateSelect = useCallback((template: Template) => {
    setMessageInput(template.content);
    setTemplatesMenuAnchorEl(null);
  }, []);
  
  // Fonctions pour les menus
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleTemplatesMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTemplatesMenuAnchorEl(event.currentTarget);
    // Fermer le menu principal
    handleMenuClose();
  };
  
  const handleTemplatesMenuClose = () => {
    setTemplatesMenuAnchorEl(null);
  };
  
  // Fonctions pour le modal IA
  const handleOpenAIModal = () => {
    setAiModalOpen(true);
  };
  
  const handleCloseAIModal = () => {
    setAiModalOpen(false);
  };
  
  const handleGeneratedResponse = (response: string) => {
    setMessageInput(response);
    setAiModalOpen(false);
  };
  
  // Défilement automatique lors du chargement initial
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, []);
  
  // Déterminer l'icône et la couleur en fonction du statut de connexion
  const connectionStatusIcon = realtimeStatus === 'SUBSCRIBED'
    ? <SignalCellularAltIcon sx={{ fontSize: 16, color: 'success.main' }} />
    : <SignalCellularConnectedNoInternet0BarIcon sx={{ fontSize: 16, color: 'warning.main' }} />;
  
  const connectionStatusText = realtimeStatus === 'SUBSCRIBED'
    ? 'Realtime'
    : isPollingActive ? 'Polling' : 'Déconnecté';
  
  const connectionStatusColor = realtimeStatus === 'SUBSCRIBED'
    ? 'success'
    : isPollingActive ? 'warning' : 'error';

  console.log(`${DEBUG_PREFIX} Rendu avec ${messages.length} messages, status: ${realtimeStatus}, isMobile: ${isMobile}`);
  
  // Composant à rendre
  const ContainerComponent = isMobile ? Paper : Card;
  
  return (
    <ContainerComponent sx={{ 
      height: isMobile ? 'calc(100vh - 56px)' : '100%',
      display: 'flex', 
      flexDirection: 'column', 
      borderRadius: isMobile ? 0 : 1,
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      position: 'relative',
      m: 0,
      p: 0,
      bgcolor: theme.palette.mode === 'dark' ? '#121212' : '#f5f7f9',
      ...(isMobile ? { boxShadow: 'none', elevation: 0 } : {})
    }}>
      {/* En-tête de la conversation - optimisé pour mobile */}
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        bgcolor: theme.palette.background.paper,
        borderBottom: '1px solid',
        borderColor: theme.palette.divider
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isMobile && onBack && (
            <IconButton 
              size="small" 
              edge="start"
              onClick={onBack}
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ 
            fontSize: isMobile ? '1rem' : '1.25rem', 
            fontWeight: 600
          }}>
            {guestName || 'Conversation'}
          </Typography>
          {!isMobile && (
            <Chip
              size="small"
              icon={connectionStatusIcon}
              label={connectionStatusText}
              color={connectionStatusColor}
              variant="outlined"
              sx={{ ml: 2, height: 24 }}
            />
          )}
        </Box>
        <Box>
          <IconButton 
            size="small" 
            onClick={forceRefresh}
            disabled={refreshing}
            title="Rafraîchir les messages"
          >
            {refreshing ? (
              <CircularProgress size={20} />
            ) : (
              <RefreshIcon fontSize="small" />
            )}
          </IconButton>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      
      {/* Zone de messages avec gestion du défilement */}
      <Box 
        ref={messagesContainerRef}
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
          display: 'flex',
          flexDirection: 'column'
        }}
        onScroll={handleScroll}
      >
        <ChatMessages 
          messages={messages}
          isInitialLoad={true}
        />
        <div ref={messagesEndRef} style={{ height: 1 }} />
      </Box>
      
      {/* Bouton de défilement vers le bas (présent uniquement si nécessaire) */}
      <Zoom in={showScrollButton}>
        <Tooltip title="Nouveaux messages">
          <Fab 
            color="primary" 
            size="small" 
            onClick={() => scrollToBottom()}
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
      
      {/* Zone de saisie de message - Utilisation de ChatInput */}
      <Box sx={{ 
        borderTop: '1px solid',
        borderColor: theme.palette.divider,
        bgcolor: theme.palette.background.paper
      }}>
        <ChatInput
          onSendMessage={async (message) => {
            setMessageInput(message);
            await handleSendMessage();
          }}
          onOpenAIModal={handleOpenAIModal}
          onOpenTemplates={handleTemplatesMenuOpen}
          disabled={sending}
        />
        
        {sendError && (
          <Typography variant="caption" color="error" sx={{ px: 2, pb: 1, display: 'block' }}>
            {sendError}
          </Typography>
        )}
      </Box>
      
      {/* Menu d'options */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleTemplatesMenuOpen}>
          <ListItemIcon>
            <FormatListBulletedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modèles de message</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <PaletteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Personnaliser</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Menu des templates */}
      <Menu
        anchorEl={templatesMenuAnchorEl}
        open={Boolean(templatesMenuAnchorEl)}
        onClose={handleTemplatesMenuClose}
      >
        {templates.length === 0 ? (
          <MenuItem disabled>
            <ListItemText>Aucun modèle disponible</ListItemText>
          </MenuItem>
        ) : (
          templates.map(template => (
            <MenuItem key={template.id} onClick={() => handleTemplateSelect(template)}>
              <ListItemText primary={template.name} />
            </MenuItem>
          ))
        )}
      </Menu>
      
      {/* Modal pour la génération de réponse IA */}
      <AIResponseModal
        open={aiModalOpen}
        onClose={handleCloseAIModal}
        onResponseGenerated={handleGeneratedResponse}
        conversationId={conversationId}
        guestName={guestName || ''}
        apartmentId={apartmentId} // Transmettre l'ID de l'appartement
      />
    </ContainerComponent>
  );
}
