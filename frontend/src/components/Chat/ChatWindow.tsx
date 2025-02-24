import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Box, 
  TextField, 
  IconButton, 
  Typography,
  Paper,
  Alert,
  Menu,
  MenuItem,
  Button,
  Tooltip,
  Divider,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

interface Message {
  id: string;
  content: string;
  created_at: string;
  direction: 'inbound' | 'outbound';
}

interface Template {
  id: string;
  name: string;
  content: string;
  language: string;
  variables: Record<string, any>;
  description?: string;
  created_at: string;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  
const [templateAnchorEl, setTemplateAnchorEl] = useState<null | HTMLElement>(null);
const [aiAnchorEl, setAiAnchorEl] = useState<null | HTMLElement>(null);
  const [isOutsideWindow, setIsOutsideWindow] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadTemplates();
    loadWhatsAppConfig();
    checkMessageWindow();

    // Souscrire aux nouveaux messages
    console.log('Setting up Supabase realtime subscription for conversation:', conversationId);
    
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Received new message:', payload.new);
          setMessages(currentMessages => {
            console.log('Current messages:', currentMessages);
            const newMessages = [...currentMessages, payload.new as Message];
            console.log('Updated messages:', newMessages);
            setTimeout(scrollToBottom, 100); // Ajout d'un petit délai pour s'assurer que le DOM est mis à jour
            return newMessages;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Received message update:', payload.new);
          setMessages(currentMessages => {
            const updatedMessages = currentMessages.map(msg =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
            );
            console.log('Updated messages after update:', updatedMessages);
            return updatedMessages;
          });
        }
      )
      .subscribe((status) => {
        console.log('Supabase channel status:', status);
      });

    // Log when the subscription is cleaned up
    return () => {
      console.log('Cleaning up Supabase realtime subscription');
      supabase.removeChannel(channel);
    };

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // On ne veut pas de scroll automatique à chaque changement de messages
  // car cela interfère avec la lecture des messages précédents

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50); // Limite pour éviter de charger trop de messages

    // On inverse l'ordre pour l'affichage (plus récents en bas)

    if (error) {
      console.error('Erreur lors du chargement des messages:', error);
      return;
    }

    setMessages((data || []).reverse());
    scrollToBottom(true); // scroll instantané au chargement initial
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('language', 'fr');

    if (error) {
      console.error('Erreur lors du chargement des templates:', error);
      return;
    }

    setTemplates(data || []);
  };

  const checkMessageWindow = () => {
    const startTime = new Date(conversationStartTime || new Date());
    const now = new Date();
    const hoursDiff = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    setIsOutsideWindow(hoursDiff > 24);
  };

  const scrollToBottom = (instant: boolean = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase.rpc('send_whatsapp_message', {
        p_conversation_id: conversationId,
        p_content: newMessage
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

  const loadWhatsAppConfig = async () => {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, token')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Erreur lors du chargement de la configuration WhatsApp:', error);
      return;
    }

    if (data) {
      setPhoneNumberId(data.phone_number_id || '');
      setWhatsappToken(data.token || '');
    }
  };

  const handleSaveConfig = async () => {
    const { error } = await supabase
      .from('whatsapp_config')
      .upsert({
        phone_number_id: phoneNumberId,
        token: whatsappToken,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
      return;
    }

    setConfigOpen(false);
  };

  const handleSendTemplate = async (template: Template) => {
    try {
      // Récupérer le numéro de téléphone de la conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('guest_phone')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        throw new Error('Conversation non trouvée');
      }

      console.log('Envoi du template:', template);

      // Récupérer la session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.error('Erreur de session:', sessionError);
        throw new Error('Non authentifié');
      }

      console.log('Session récupérée:', {
        token: session.access_token.substring(0, 20) + '...',
        expires_at: new Date(session.expires_at! * 1000).toISOString()
      });

      // Envoyer le template via la fonction Edge
      const response = await fetch(`/.netlify/functions/send-whatsapp-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          template_name: template.name,
          language: template.language,
          to: conversation.guest_phone
        })
      });

      let result;
      try {
        result = await response.json();
        console.log('Réponse de la fonction Edge:', {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: result
        });
      } catch (e) {
        console.error('Erreur lors du parsing de la réponse:', e);
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      if (!response.ok) {
        const errorMessage = result?.error || 'Erreur lors de l\'envoi du template';
        console.error('Erreur de la fonction Edge:', errorMessage);
        throw new Error(errorMessage);
      }

      // Créer le message dans la base de données
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: `Template envoyé: ${template.name}`,
          direction: 'outbound',
          type: 'template',
          status: 'sent'
        });

      if (msgError) throw msgError;

      setTemplateAnchorEl(null);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du template:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 800 }}>
      {/* En-tête */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">{guestNumber}</Typography>
            <Typography variant="body2" color="text.secondary">
              {propertyName}
            </Typography>
          </Box>

        </Box>
      </Paper>

      {/* Menu des templates */}
      <Menu
        anchorEl={templateAnchorEl}
        open={Boolean(templateAnchorEl)}
        onClose={() => setTemplateAnchorEl(null)}
      >
        <MenuItem disabled sx={{ opacity: 1 }}>
          <ListItemIcon>
            <WhatsAppIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Templates WhatsApp"
            secondary="Sélectionnez un template à envoyer"
          />
        </MenuItem>
        <Divider />
        {templates.map((template) => (
          <MenuItem 
            key={template.id}
            onClick={() => handleSendTemplate(template)}
          >
            <ListItemText 
              primary={`${template.name}`}
              secondary={template.description}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Dialog de configuration WhatsApp */}
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configuration WhatsApp</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Phone Number ID"
              variant="outlined"
              fullWidth
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="Entrez votre Phone Number ID WhatsApp"
            />
            <TextField
              label="Token WhatsApp"
              variant="outlined"
              fullWidth
              value={whatsappToken}
              onChange={(e) => setWhatsappToken(e.target.value)}
              type="password"
              placeholder="Entrez votre token WhatsApp"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>Annuler</Button>
          <Button onClick={handleSaveConfig} variant="contained" color="primary">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de l'IA */}
      <Menu
        anchorEl={aiAnchorEl}
        open={Boolean(aiAnchorEl)}
        onClose={() => setAiAnchorEl(null)}
      >
        <MenuItem disabled sx={{ opacity: 1 }}>
          <ListItemIcon>
            <AutoAwesomeIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Assistant IA"
            secondary="Générer une réponse automatique"
          />
        </MenuItem>
        <Divider />
        <MenuItem disabled>
          <ListItemText 
            primary="Fonctionnalité à venir"
            secondary="L'assistant IA sera bientôt disponible"
          />
        </MenuItem>
      </Menu>

      {/* Messages */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              alignSelf: message.direction === 'outbound' ? 'flex-end' : 'flex-start',
              maxWidth: '70%'
            }}
          >
            <Paper
              sx={{
                p: 1,
                bgcolor: message.direction === 'outbound' ? 'primary.main' : 'grey.100',
                color: message.direction === 'outbound' ? 'white' : 'text.primary'
              }}
            >
              <Typography variant="body1">{message.content}</Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block',
                  textAlign: 'right',
                  mt: 0.5,
                  opacity: 0.8
                }}
              >
                {new Date(message.created_at).toLocaleTimeString()}
              </Typography>
            </Paper>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Zone de saisie */}
      {isOutsideWindow ? (
        <Alert 
          severity="warning" 
          action={
            <Button
              color="inherit"
              size="small"
              onClick={(e) => setTemplateAnchorEl(e.currentTarget)}
            >
              Utiliser un template
            </Button>
          }
        >
          La fenêtre de 24h est dépassée. Vous devez utiliser un template.
        </Alert>
      ) : (
        <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Templates WhatsApp">
            <IconButton 
              color="primary" 
              onClick={(e) => setTemplateAnchorEl(e.currentTarget)}
              sx={{ flexShrink: 0 }}
            >
              <WhatsAppIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Réponse IA">
            <IconButton 
              color="primary" 
              onClick={(e) => setAiAnchorEl(e.currentTarget)}
              sx={{ flexShrink: 0 }}
            >
              <AutoAwesomeIcon />
            </IconButton>
          </Tooltip>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Votre message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
