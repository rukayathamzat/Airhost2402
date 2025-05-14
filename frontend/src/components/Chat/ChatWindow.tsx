import React, { useState, useCallback, useEffect } from 'react';
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
  Snackbar,
  Alert
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularConnectedNoInternet0BarIcon from '@mui/icons-material/SignalCellularConnectedNoInternet0Bar';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import PaletteIcon from '@mui/icons-material/Palette';
import Close from '@mui/icons-material/Close';

import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import AIResponseModal from '../AIResponseModal';
import TemplateMenu from './ChatTemplates/TemplateMenu';
import { useMessagesRealtime } from '../../hooks/useMessagesRealtime';
import { useMessageSender } from '../../hooks/useMessageSender';
import { useTemplates } from '../../hooks/useTemplates';
import { TemplateService, Template } from '../../services/chat/template.service';
import { AIResponseService } from '../../services/ai-response.service';
import { EmergencyDetectionService } from '../../services/emergency-detection.service';
import { AutoPilotService } from '../../services/auto-pilot.service';
import AutoPilotSettings from '../AutoPilotSettings/AutoPilotSettings';

// Préfixe pour les logs liés à ce composant
const DEBUG_PREFIX = 'DEBUG_CHAT_WINDOW';

interface ChatWindowProps {
  conversationId: string;
  whatsappContactId?: string;
  guestName?: string;
  isMobile?: boolean;
  apartmentId?: string; // ID de l'appartement pour les requêtes IA
}

export default function ChatWindow({ conversationId, whatsappContactId, guestName, isMobile = false, apartmentId }: ChatWindowProps) {
  // États locaux
  const [messageInput, setMessageInput] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [templatesMenuAnchorEl, setTemplatesMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [emergencyAlert, setEmergencyAlert] = useState<{
    show: boolean;
    severity: 'immediate' | 'urgent' | 'standard';
    message: string;
  } | null>(null);
  const [autoPilotSettingsOpen, setAutoPilotSettingsOpen] = useState(false);
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  
  // Utilisation des hooks personnalisés
  const { 
    messages, 
    realtimeStatus, 
    refreshing, 
    isPollingActive, 
    forceRefresh 
  } = useMessagesRealtime(conversationId, apartmentId);
  
  const { sendMessage, sending, error: sendError } = useMessageSender();
  const { templates } = useTemplates();
  
  // Gestionnaire pour l'envoi de message
  const handleSendMessage = useCallback(async (messageToSend: string = messageInput) => {
    const contentToSend = messageToSend.trim();
    if (!contentToSend) return;
    
    try {
      // Check for emergency keywords
      const emergencyCheck = await EmergencyDetectionService.detectEmergency(contentToSend);
      
      if (emergencyCheck.isEmergency && emergencyCheck.severity) {
        // Show emergency alert
        setEmergencyAlert({
          show: true,
          severity: emergencyCheck.severity,
          message: emergencyCheck.response || 'Emergency detected'
        });

        // Notify property manager
        if (apartmentId) {
          await EmergencyDetectionService.notifyPropertyManager(apartmentId, {
            message: contentToSend,
            severity: emergencyCheck.severity,
            detectedKeywords: emergencyCheck.detectedKeywords || []
          });
        }
      }

      // Send the message
      const sentMessage = await sendMessage(
        contentToSend,
        conversationId,
        whatsappContactId
      );
      
      if (sentMessage) {
        setMessageInput('');
        
        // Check if we should auto-respond
        if (apartmentId && autoPilotEnabled) {
          const shouldRespond = await AutoPilotService.shouldAutoRespond(
            apartmentId,
            contentToSend,
            conversationId
          );
          
          if (shouldRespond) {
            const autoResponse = await AutoPilotService.generateAutoResponse(
              apartmentId,
              contentToSend,
              conversationId
            );
            
            if (autoResponse) {
              await sendMessage(
                autoResponse,
                conversationId,
                whatsappContactId
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors de l'envoi du message:`, error);
    }
  }, [messageInput, conversationId, whatsappContactId, sendMessage, apartmentId, autoPilotEnabled]);
  
  // Cette fonction est gérée par le composant ChatInput
  // Aucun gestionnaire handleKeyPress direct n'est nécessaire ici
  
  // Gestionnaire pour la sélection d'un template (copier son contenu dans le champ de message)
  const handleTemplateSelect = useCallback((template: Template) => {
    setMessageInput(template.content);
    setTemplatesMenuAnchorEl(null);
  }, []);
  
  // Gestionnaire pour l'envoi d'un template WhatsApp
  const handleSendWhatsAppTemplate = useCallback(async (template: Template) => {
    if (!whatsappContactId) {
      setSnackbarMessage('Impossible d\'envoyer le template : numéro WhatsApp manquant');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      console.log(`${DEBUG_PREFIX} Envoi du template WhatsApp:`, {
        template_name: template.name,
        to: whatsappContactId
      });
      
      await TemplateService.sendTemplate(conversationId, whatsappContactId, template);
      
      setSnackbarMessage('Template WhatsApp envoyé avec succès');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Force le rafraîchissement des messages pour voir le template envoyé
      forceRefresh();
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors de l'envoi du template WhatsApp:`, error);
      setSnackbarMessage(
        `Erreur lors de l'envoi du template: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [conversationId, whatsappContactId, forceRefresh]);
  
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
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  // Fonctions pour le modal IA
  const handleOpenAIModal = () => {
    setAiModalOpen(true);
  };
  
  const handleCloseAIModal = () => {
    setAiModalOpen(false);
  };
  
  const handleGeneratedResponse = (response: string) => {
    // Fermer le modal
    setAiModalOpen(false);
    // Effacer le champ de saisie (car on envoie directement)
    setMessageInput('');
    // Appeler directement la fonction d'envoi avec la réponse générée
    handleSendMessage(response);
  };
  
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

  // Function to fetch AI suggestions
  const fetchAiSuggestions = useCallback(async () => {
    try {
      if (!apartmentId) {
        console.log('No apartmentId provided, skipping AI suggestions');
        return;
      }
      const response = await AIResponseService.generateResponse(apartmentId, conversationId);
      // Ensure we're setting an array of strings
      if (Array.isArray(response)) {
        setAiSuggestions(response);
      } else if (typeof response === 'string') {
        setAiSuggestions([response]);
      } else if (response && typeof response === 'object' && 'response' in response) {
        // Handle case where response is an object with a response property
        const suggestions = Array.isArray(response.response) ? response.response : [response.response];
        setAiSuggestions(suggestions);
      } else {
        console.error('Unexpected response format:', response);
        setAiSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      setAiSuggestions([]);
    }
  }, [apartmentId, conversationId]);

  // Call fetchAiSuggestions when the component mounts
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} apartmentId:`, apartmentId);
    fetchAiSuggestions();
  }, [fetchAiSuggestions]);

  // Add emergency alert component
  const EmergencyAlert = () => {
    if (!emergencyAlert?.show) return null;

    const severityColors = {
      immediate: '#dc2626',
      urgent: '#f59e0b',
      standard: '#3b82f6'
    };

    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bgcolor: severityColors[emergencyAlert.severity],
          color: 'white',
          p: 2,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="body1">
          {emergencyAlert.message}
        </Typography>
        <IconButton
          size="small"
          onClick={() => setEmergencyAlert(null)}
          sx={{ color: 'white' }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>
    );
  };

  // Add useEffect to check auto-pilot status
  useEffect(() => {
    const checkAutoPilotStatus = async () => {
      if (apartmentId) {
        const config = await AutoPilotService.getConfig(apartmentId);
        setAutoPilotEnabled(config.isEnabled);
      }
    };
    checkAutoPilotStatus();
  }, [apartmentId]);

  // Add auto-pilot menu item
  const handleOpenAutoPilotSettings = () => {
    setAutoPilotSettingsOpen(true);
    handleMenuClose();
  };

  console.log(`${DEBUG_PREFIX} Rendu avec ${messages.length} messages, status: ${realtimeStatus}, isMobile: ${isMobile}`);
  
  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      borderRadius: 1,
      ...(isMobile ? { boxShadow: 'none' } : {})
    }}>
      <EmergencyAlert />
      {/* En-tête de la conversation */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            {guestName || 'Conversation'}
          </Typography>
          <Chip
            size="small"
            icon={connectionStatusIcon}
            label={connectionStatusText}
            color={connectionStatusColor}
            variant="outlined"
            sx={{ ml: 2, height: 24 }}
          />
          {autoPilotEnabled && (
            <Chip
              size="small"
              label="Auto-Pilot"
              color="primary"
              sx={{ ml: 2 }}
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
      
      <Divider />
      
      {/* Zone de messages */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <ChatMessages 
          messages={messages}
          isInitialLoad={true}
        />
        {/* Render AI suggestions */}
        {aiSuggestions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">AI Suggestions:</Typography>
            {aiSuggestions.map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                onClick={() => handleSendMessage(suggestion)}
                sx={{ m: 0.5 }}
              />
            ))}
          </Box>
        )}
      </Box>
      
      <Divider />
      
      {/* Zone de saisie de message - Utilisation de ChatInput */}
      <Box sx={{ bgcolor: 'background.default' }}>
        <ChatInput
          onSendMessage={async (message) => {
            // Passage direct du message à handleSendMessage pour éviter le problème de timing du state
            await handleSendMessage(message);
            // On met quand même à jour le state pour garder une cohérence
            setMessageInput('');
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
        <MenuItem onClick={handleOpenAutoPilotSettings}>
          <ListItemIcon>
            <SignalCellularAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Auto-Pilot Settings</ListItemText>
        </MenuItem>
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
      
      {/* Menu des templates avec la nouvelle interface */}
      <TemplateMenu
        anchorEl={templatesMenuAnchorEl}
        open={Boolean(templatesMenuAnchorEl)}
        onClose={handleTemplatesMenuClose}
        templates={templates}
        onSelectTemplate={handleTemplateSelect}
        onSendWhatsAppTemplate={handleSendWhatsAppTemplate}
        whatsappContactId={whatsappContactId}
      />
      
      {/* Notification pour l'envoi de template */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* Modal pour la génération de réponse IA */}
      <AIResponseModal
        open={aiModalOpen}
        onClose={handleCloseAIModal}
        onResponseGenerated={handleGeneratedResponse}
        conversationId={conversationId}
        guestName={guestName || ''}
        apartmentId={apartmentId} // Transmettre l'ID de l'appartement
      />
      
      {/* Add AutoPilotSettings component */}
      <AutoPilotSettings
        open={autoPilotSettingsOpen}
        onClose={() => setAutoPilotSettingsOpen(false)}
        propertyId={apartmentId || ''}
      />
    </Card>
  );
}
