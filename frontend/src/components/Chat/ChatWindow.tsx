import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  AlertTitle,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SignalCellularConnectedNoInternet0BarIcon from '@mui/icons-material/SignalCellularConnectedNoInternet0Bar';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import PaletteIcon from '@mui/icons-material/Palette';
import Close from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import AIResponseModal from '../AIResponseModal';
import TemplateMenu from './ChatTemplates/TemplateMenu';
import { useMessagesRealtime } from '../../hooks/useMessagesRealtime';
import { useMessageSender } from '../../hooks/useMessageSender';
import { useTemplates } from '../../hooks/useTemplates';
import { TemplateService, Template } from '../../services/chat/template.service';
import { AIResponseService } from '../../services/ai-response.service';
import { EmergencyDetectionService, EmergencyDetectionResult } from '../../services/emergency-detection.service';
import { AutoPilotService } from '../../services/auto-pilot.service';
import AutoPilotSettings from '../AutoPilotSettings/AutoPilotSettings';
import AISuggestionBox from './AISuggestionBox';
import { UnknownQueryService, UnknownQueryResult } from '../../services/unknown-query.service';

// Préfixe pour les logs liés à ce composant
const DEBUG_PREFIX = 'DEBUG_CHAT_WINDOW';

interface ChatWindowProps {
  conversationId: string;
  whatsappContactId?: string;
  guestName?: string;
  isMobile?: boolean;
  apartmentId?: string; // ID de l'appartement pour les requêtes IA
  onClose: () => void;
  open: boolean;
}

export default function ChatWindow({ conversationId, whatsappContactId, guestName, isMobile = false, apartmentId, onClose, open }: ChatWindowProps) {
  // États locaux
  const [messageInput, setMessageInput] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [templatesMenuAnchorEl, setTemplatesMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [emergencyAlert, setEmergencyAlert] = useState<{
    show: boolean;
    severity: 'immediate' | 'urgent' | 'standard';
    message: string;
    timestamp: string;
  } | null>(null);
  const [autoPilotSettingsOpen, setAutoPilotSettingsOpen] = useState(false);
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<string | null>(null);
  const [emergencyDetectionResult, setEmergencyDetectionResult] = useState<EmergencyDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unknownQueryAlert, setUnknownQueryAlert] = useState<UnknownQueryResult | null>(null);
  const emergencyDetectionService = useMemo(() => EmergencyDetectionService.getInstance(), []);
  const unknownQueryService = useMemo(() => UnknownQueryService.getInstance(), []);
  
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
  
  // Update error state when sendError changes
  useEffect(() => {
    if (sendError) {
      setError(sendError);
    }
  }, [sendError]);
  
  // Gestionnaire pour l'envoi de message
  const handleSendMessage = useCallback(async (messageToSend: string = messageInput) => {
    const contentToSend = messageToSend.trim();
    if (!contentToSend) return;
    
    try {
      // Check for emergency keywords
      const detectionResult = await emergencyDetectionService.detectEmergency(contentToSend);
      setEmergencyDetectionResult(detectionResult);
      
      // Check for unknown query
      const unknownResult = await unknownQueryService.detectUnknownQuery(contentToSend);
      setUnknownQueryAlert(unknownResult.isUnknown ? unknownResult : null);
      
      if (detectionResult.detected) {
        // Show emergency alert
        setEmergencyAlert({
          show: true,
          severity: detectionResult.severity || 'standard',
          message: detectionResult.matchedCase?.response_template || 'Emergency detected. Please provide more details.',
          timestamp: new Date().toISOString()
        });

        // Notify property manager with emergency case information
        if (apartmentId) {
          await EmergencyDetectionService.notifyPropertyManager(apartmentId, {
            message: contentToSend,
            severity: detectionResult.severity || 'standard',
            detectedKeywords: detectionResult.matchedKeywords || [],
            emergencyCaseId: detectionResult.matchedCase?.id,
            emergencyCaseName: detectionResult.matchedCase?.name
          });
        }

        // If auto-pilot is enabled, send the emergency response
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

      // Send the message
      await sendMessage(contentToSend, conversationId, whatsappContactId);
      setMessageInput('');
      setShowSuggestion(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setEmergencyAlert(null);
      setEmergencyDetectionResult(null);
      setError('Failed to send message');
    }
  }, [messageInput, conversationId, whatsappContactId, sendMessage, apartmentId, autoPilotEnabled, emergencyDetectionService, unknownQueryService]);
  
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

  // Update the fetchAiSuggestions function to handle single suggestion
  const fetchAiSuggestion = useCallback(async () => {
    try {
      if (!apartmentId) {
        console.log('No apartmentId provided, skipping AI suggestion');
        return;
      }
      const response = await AIResponseService.generateResponse(apartmentId, conversationId);
      let suggestion: string;
      
      if (typeof response === 'string') {
        suggestion = response;
      } else if (response && typeof response === 'object' && 'response' in response) {
        suggestion = Array.isArray(response.response) ? response.response[0] : response.response;
      } else {
        console.error('Unexpected response format:', response);
        return;
      }
      
      setAiSuggestion(suggestion);
      setShowSuggestion(true);
    } catch (error) {
      console.error('Error fetching AI suggestion:', error);
      setAiSuggestion(null);
      setShowSuggestion(false);
    }
  }, [apartmentId, conversationId]);

  // Add effect to check for new messages and show suggestion
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.direction === 'inbound' && 
          lastMessage.created_at !== lastMessageTimestamp) {
        setLastMessageTimestamp(lastMessage.created_at);
        fetchAiSuggestion();
      }
    }
  }, [messages, lastMessageTimestamp, fetchAiSuggestion]);

  // Handle suggestion actions
  const handleSuggestionSend = async (suggestion: string) => {
    await handleSendMessage(suggestion);
    setShowSuggestion(false);
  };

  const handleSuggestionEdit = (editedSuggestion: string) => {
    setAiSuggestion(editedSuggestion);
  };

  const handleSuggestionClose = () => {
    setShowSuggestion(false);
  };

  const handleSuggestionRegenerate = () => {
    fetchAiSuggestion();
  };

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

  useEffect(() => {
    if (apartmentId) {
      emergencyDetectionService.setPropertyId(apartmentId);
      unknownQueryService.setPropertyId(apartmentId);
    }
  }, [apartmentId, emergencyDetectionService, unknownQueryService]);

  console.log(`${DEBUG_PREFIX} Rendu avec ${messages.length} messages, status: ${realtimeStatus}, isMobile: ${isMobile}`);
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Chat with Guest</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={autoPilotEnabled ? 'contained' : 'outlined'}
              color={autoPilotEnabled ? 'primary' : 'inherit'}
              onClick={handleOpenAutoPilotSettings}
              startIcon={<AutoAwesomeIcon />}
            >
              Auto Pilot {autoPilotEnabled ? 'On' : 'Off'}
            </Button>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {emergencyAlert && (
          <Alert
            severity={emergencyAlert.severity === 'immediate' ? 'error' : 
                      emergencyAlert.severity === 'urgent' ? 'warning' : 'info'}
            sx={{ mb: 2 }}
            onClose={() => setEmergencyAlert(null)}
          >
            <AlertTitle>
              {emergencyAlert.severity === 'immediate' ? 'EMERGENCY DETECTED' :
               emergencyAlert.severity === 'urgent' ? 'URGENT' : 'Emergency Detected'}
            </AlertTitle>
            {emergencyAlert.message}
            {emergencyDetectionResult?.matchedCase && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Matched case: {emergencyDetectionResult.matchedCase.name}
              </Typography>
            )}
            {emergencyDetectionResult && emergencyDetectionResult.matchedKeywords && emergencyDetectionResult.matchedKeywords.length > 0 && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Matched keywords: {emergencyDetectionResult.matchedKeywords.join(', ')}
              </Typography>
            )}
          </Alert>
        )}

        {unknownQueryAlert && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            onClose={() => setUnknownQueryAlert(null)}
          >
            <AlertTitle>Unknown Query Detected</AlertTitle>
            <Typography variant="body2">
              This message may require clarification or additional context.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Reason: {unknownQueryAlert.reason}
            </Typography>
            {unknownQueryAlert.suggestedResponse && (
              <Box sx={{ mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Suggested Response:
                </Typography>
                <Typography variant="body2">
                  {unknownQueryAlert.suggestedResponse}
                </Typography>
              </Box>
            )}
          </Alert>
        )}

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
            {/* Replace old AI suggestions with new AISuggestionBox */}
            {showSuggestion && aiSuggestion && (
              <AISuggestionBox
                suggestion={aiSuggestion}
                onSend={handleSuggestionSend}
                onEdit={handleSuggestionEdit}
                onClose={handleSuggestionClose}
                onRegenerate={handleSuggestionRegenerate}
              />
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
      </DialogContent>
    </Dialog>
  );
}
