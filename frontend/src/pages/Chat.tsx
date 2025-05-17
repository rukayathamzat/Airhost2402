import { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Button, 
  Typography, 
  CircularProgress,
  useMediaQuery,
  useTheme,
  IconButton,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  BottomNavigation,
  BottomNavigationAction,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
// import CloseIcon from '@mui/icons-material/Close'; // Supprimé car non utilisé
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ApartmentIcon from '@mui/icons-material/Apartment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ChatIcon from '@mui/icons-material/Chat';
import MenuIcon from '@mui/icons-material/Menu';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
// Suppression de l'import TestIcon
import ConversationList from '../components/Chat/ConversationList';
import ChatWindow from '../components/Chat/ChatWindow';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { MobileNotificationService } from "../services/notification/mobile-notification.service";
import { WhatsAppService } from '../services/chat/whatsapp.service';

import { Conversation } from '../types/conversation';

export default function Chat() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navValue, setNavValue] = useState('messages');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // États pour la configuration WhatsApp
  const [configOpen, setConfigOpen] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [saving, setSaving] = useState(false);
  
  // État pour le bouton de test de notification supprimé

  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    console.log('Chat component mounted', new Date().toISOString());
    checkSession();
    fetchConversations();
    setupDebugListener();
    setupRealtimeSubscription();
  }, []);

  // Configuration de la souscription Realtime pour les mises à jour de conversations
  const setupRealtimeSubscription = () => {
    console.log('Setting up realtime subscription for conversations table');
    const channel = supabase
      .channel('public:conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        console.log('REALTIME CHAT: Received conversation update:', payload);
        // Rafraîchir les conversations à chaque mise à jour
        fetchConversations();
      })
      .subscribe((status) => {
        console.log('REALTIME CHAT: Subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  };

  const setupDebugListener = () => {
    // Écouteur pour vérifier l'état de la connexion Supabase
    console.log('DEBUG: Configuring Supabase connection listener');
    const supabaseListener = supabase.channel('system');
    supabaseListener
      .on('system', { event: 'disconnect' }, (payload) => {
        console.error('DEBUG: Supabase connection DISCONNECTED:', payload, new Date().toISOString());
      })
      .on('system', { event: 'reconnect' }, (payload) => {
        console.log('DEBUG: Supabase connection RECONNECTED:', payload, new Date().toISOString());
      })
      .on('system', { event: 'connected' }, (payload) => {
        console.log('DEBUG: Supabase connection ESTABLISHED:', payload, new Date().toISOString());
      })
      .subscribe((status) => {
        console.log('DEBUG: Supabase system channel status:', status, new Date().toISOString());
      });

    return () => {
      supabaseListener.unsubscribe();
    };
  };

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session dans Chat:', session);
    if (!session) {
      navigate('/login');
    }
  };

  const fetchConversations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const timestamp = new Date().toISOString();
      console.log(`Récupération des conversations pour: ${session.user.id} [${timestamp}]`);
      
      // Afficher les conversations actuelles pour débogage
      if (conversations.length > 0) {
        console.log('AVANT - État actuel des conversations:', conversations.map(c => ({
          id: c.id,
          guest_name: c.guest_name,
          last_message_at: c.last_message_at
        })));
      }
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          guest_name,
          guest_phone,
          property:properties!inner(name, host_id, id),
          check_in_date,
          check_out_date,
          status,
          last_message,
          last_message_at,
          unread_count
        `)
        .eq('property.host_id', session.user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Transformer les données
      const transformedData = data?.map(item => ({
        ...item,
        property: Array.isArray(item.property) ? item.property : [item.property]
      })) || [];
      
      console.log(`APRES - Nouvelles conversations récupérées [${timestamp}]:`, transformedData.map(c => ({
        id: c.id,
        guest_name: c.guest_name,
        last_message: c.last_message,
        last_message_at: c.last_message_at
      })));
      
      // Forcer une mise à jour de l'état, même si les données semblent identiques
      setConversations(prevConversations => {
        // Comparer de manière détaillée les anciennes et nouvelles conversations
        const hasChanges = JSON.stringify(prevConversations) !== JSON.stringify(transformedData);
        console.log(`Changements détectés: ${hasChanges ? 'OUI' : 'NON'} [${timestamp}]`);
        
        // Forcer un re-rendu même si les données semblent identiques
        // en ajoutant un timestamp à chaque conversation
        return transformedData.map(conv => ({
          ...conv,
          _refreshTimestamp: timestamp // Champ temporaire pour forcer le re-rendu
        }));
      });
    } catch (err: any) {
      console.error('Erreur lors de la récupération des conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" gutterBottom>
          {error === 'Non authentifié' 
            ? 'Vous devez être connecté pour accéder à cette page'
            : error
          }
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => error === 'Non authentifié' ? navigate('/login') : window.location.reload()}
        >
          {error === 'Non authentifié' ? 'Se connecter' : 'Réessayer'}
        </Button>
      </Box>
    );
  }

  const handleBackFromChat = () => {
    setSelectedConversation(null);
  };

  // Fonction pour marquer les messages comme lus lorsqu'une conversation est ouverte
  const markConversationAsRead = async (conversationId: string) => {
    try {
      // Mettre à jour le champ unread_count pour cette conversation
      const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);
      
      if (error) {
        console.error('Erreur lors de la mise à jour des messages non lus:', error);
      } else {
        console.log(`Conversation ${conversationId} marquée comme lue`);
        // Mettre à jour la liste des conversations en mémoire
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === conversationId 
              ? { ...conv, unread_count: 0 } 
              : conv
          )
        );
      }
    } catch (err) {
      console.error('Erreur:', err);
    }
  };
  
  const handleMenuToggle = () => {
    setMenuOpen(!menuOpen);
    // Si le menu est ouvert et qu'on clique dessus, on le ferme et vice versa
    if (navValue !== 'menu') {
      setNavValue('menu');
    }
  };
  
  // Fonction non utilisée, commentée pour éviter les avertissements TypeScript
  // const handleMenuClose = () => {
  //   setMenuOpen(false);
  // };
  
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };
  
  // Gestion de la configuration WhatsApp
  const openWhatsAppConfig = async () => {
    console.log('Ouverture de la configuration WhatsApp via service WhatsApp');
    
    try {
      // Utiliser le service WhatsApp directement
      const config = await WhatsAppService.getConfig();
      
      console.log('Configuration WhatsApp récupérée:', config);
      
      if (config) {
        setPhoneNumberId(config.phone_number_id || '');
        setWhatsappToken(config.token || '');
      } else {
        console.log('Aucune configuration WhatsApp trouvée, utilisation des valeurs par défaut');
      }

      // Force l'ouverture de la popup
      setConfigOpen(true);
    } catch (error) {
      console.error('Erreur lors de la récupération de la configuration WhatsApp:', error);
    }
  };
  
  // Fonction de test des notifications supprimée

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      
      // Préparer les données de configuration
      const configData = {
        phone_number_id: phoneNumberId,
        token: whatsappToken
      };
      
      console.log("Sauvegarde de la configuration WhatsApp via service WhatsApp:", configData);
      
      // Utiliser le service WhatsApp directement
      const success = await WhatsAppService.saveConfig(configData);
      
      if (!success) {
        console.error("Erreur lors de la sauvegarde de la configuration WhatsApp");
        setSaving(false);
        return;
      }
      
      console.log("Configuration WhatsApp sauvegardée avec succès");

      setConfigOpen(false);
      setSaving(false);
    } catch (error) {
      console.error('Erreur:', error);
      setSaving(false);
    }
  };

  // Add handler for dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    // Small delay before clearing the conversation to ensure smooth transition
    setTimeout(() => {
      setSelectedConversation(null);
    }, 100);
  };

  // Update conversation selection handler
  const handleSelectConversation = (conversation: Conversation) => {
    // Close any open dialog first
    setDialogOpen(false);
    // Small delay before opening new dialog
    setTimeout(() => {
      if (conversation.unread_count && conversation.unread_count > 0) {
        markConversationAsRead(conversation.id);
      }
      setSelectedConversation(conversation);
      setDialogOpen(true);
    }, 100);
  };

  return (
    <Container maxWidth="xl" sx={{ 
      height: '100vh', 
      p: isMobile ? 0 : 3,
      position: 'relative'  // Nécessaire pour positionner la barre de navigation
    }}>
      <Paper sx={{ 
        height: isMobile ? 'calc(100% - 56px)' : '100%',  // Ajustement pour la barre de navigation mobile
        display: 'flex',
        overflow: 'hidden',
        borderRadius: isMobile ? 0 : 1
      }}>
        {/* Version desktop: Liste des conversations sur le côté */}
        {!isMobile && (
          <Box sx={{ 
            width: 360, 
            borderRight: 1, 
            borderColor: 'divider',
            overflow: 'auto',
            flexShrink: 0
          }}>
            <ConversationList
              conversations={conversations}
              onSelectConversation={handleSelectConversation}
              onConversationUpdate={fetchConversations}
            />
          </Box>
        )}

        {/* Fenêtre de chat - plein écran en mobile, cachée si aucune conversation n'est sélectionnée */}
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'grey.50',
          height: '100%',
          position: 'relative'
        }}>
          {/* AppBar en mode mobile avec le titre uniquement */}
          {isMobile && (
            <AppBar position="static" color="default" elevation={1} sx={{ flexShrink: 0 }}>
              <Toolbar>
                {selectedConversation && (
                  <IconButton
                    edge="start"
                    color="inherit"
                    aria-label="back"
                    onClick={handleBackFromChat}
                    sx={{ mr: 2 }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                )}
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 500 }}>
                  {selectedConversation 
                    ? selectedConversation.guest_name 
                    : navValue === 'messages' 
                      ? 'Conversations' 
                      : navValue === 'menu' 
                        ? 'Menu' 
                        : navValue === 'apartments' 
                          ? 'Appartements' 
                          : navValue === 'urgency' 
                            ? 'Urgences' 
                            : navValue === 'settings'
                              ? 'Paramètres'
                              : 'Menu'}
                </Typography>
              </Toolbar>
            </AppBar>
          )}
          
          {/* Affichage du contenu en fonction de l'état de navigation */}
          {isMobile ? (
            selectedConversation ? (
              <ChatWindow
                conversationId={selectedConversation.id}
                isMobile={isMobile}
                apartmentId={selectedConversation.property?.[0]?.id || 'default'}
                whatsappContactId={selectedConversation.guest_phone || selectedConversation.guest_number}
                guestName={selectedConversation.guest_name}
                onClose={handleDialogClose}
                open={dialogOpen}
              />
            ) : (
              <Box sx={{ height: '100%', overflow: 'auto', p: 0 }}>
                <ConversationList
                  conversations={conversations}
                  onSelectConversation={handleSelectConversation}
                  onConversationUpdate={fetchConversations}
                />
              </Box>
            )
          ) : (
            // Version desktop
            selectedConversation ? (
              <ChatWindow
                conversationId={selectedConversation.id}
                isMobile={isMobile}
                apartmentId={selectedConversation.property?.[0]?.id || 'default'}
                whatsappContactId={selectedConversation.guest_phone || selectedConversation.guest_number}
                guestName={selectedConversation.guest_name}
                onClose={handleDialogClose}
                open={dialogOpen}
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'text.secondary'
                }}
              >
                Sélectionnez une conversation pour commencer
              </Box>
            )
          )}
        </Box>
      </Paper>

      {/* Dialog de configuration WhatsApp */}
      <Dialog 
        open={configOpen} 
        onClose={() => {
          console.log('Fermeture du dialog');
          setConfigOpen(false);
        }} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1400 }}
      >
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
          <Button 
            onClick={() => {
              console.log('Annulation de la configuration');
              setConfigOpen(false);
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSaveConfig} 
            variant="contained" 
            color="primary"
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barre de navigation fixe en bas pour mobile, inspirée d'Airbnb */}
      {isMobile && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            borderRadius: 0,
            boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.05)'
          }}
          elevation={3}
        >
          <BottomNavigation
            value={navValue}
            onChange={(_, newValue) => {
              setNavValue(newValue);
            }}
            showLabels
            sx={{ height: 56 }}
          >
            <BottomNavigationAction 
              label="Messages" 
              value="messages"
              icon={
                <Badge 
                  badgeContent={conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)} 
                  color="error"
                  max={99}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}
                >
                  <ChatIcon />
                </Badge>
              } 
              sx={{ minWidth: 'auto' }}
            />
            <BottomNavigationAction 
              label="Appartements" 
              value="apartments"
              icon={<ApartmentIcon />} 
              sx={{ minWidth: 'auto' }}
            />
            <BottomNavigationAction 
              label="Urgences" 
              value="urgency"
              icon={<NotificationsIcon />} 
              sx={{ minWidth: 'auto' }}
            />
            <BottomNavigationAction 
              label="Menu" 
              value="menu"
              icon={<MenuIcon />} 
              sx={{ minWidth: 'auto' }}
              onClick={handleMenuToggle}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Container>
  );
}
