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
import { MobileNotificationService } from '../services/notification/mobile-notification.service';
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
    console.log('Ouverture de la configuration WhatsApp via Edge Function (invoke)');
    
    try {
      // Utiliser supabase.functions.invoke au lieu de fetch pour gérer automatiquement l'authentification
      console.log('Appel de l\'Edge Function avec supabase.functions.invoke');
      const { data, error } = await supabase.functions.invoke('whatsapp-config', {
        method: 'GET'
      });
      
      console.log('Réponse de l\'Edge Function:', data, error);
      
      if (error) {
        console.error("Erreur lors de l'appel à l'Edge Function:", error);
        return;
      }
      
      console.log("Configuration WhatsApp récupérée via Edge Function avec succès:", data);

      if (data) {
        setPhoneNumberId(data.phone_number_id || '');
        setWhatsappToken(data.token || '');
      } else {
        console.log('Aucune configuration WhatsApp trouvée, utilisation des valeurs par défaut');
      }

      // Force l'ouverture de la popup
      setConfigOpen(true);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };
  
  // Fonction de test des notifications supprimée

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      
      // Préparer les données de configuration
      const configData = {
        phone_number_id: phoneNumberId,
        token: whatsappToken,
        updated_at: new Date().toISOString()
      };
      
      console.log("Sauvegarde de la configuration WhatsApp via Edge Function (invoke):", configData);
      
      // Utiliser supabase.functions.invoke au lieu de fetch pour gérer automatiquement l'authentification
      const { data: result, error } = await supabase.functions.invoke('whatsapp-config', {
        method: 'POST',
        body: configData
      });
      
      console.log('Réponse de l\'Edge Function (sauvegarde):', result, error);
      
      if (error) {
        console.error("Erreur lors de l'appel à l'Edge Function:", error);
        setSaving(false);
        return;
      }
      
      console.log("Configuration WhatsApp sauvegardée via Edge Function avec succès:", result);

      setConfigOpen(false);
      setSaving(false);
    } catch (error) {
      console.error('Erreur:', error);
      setSaving(false);
    }
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
              onSelectConversation={(conversation) => {
                // Marquer la conversation comme lue
                if (conversation.unread_count && conversation.unread_count > 0) {
                  markConversationAsRead(conversation.id);
                }
                // Puis sélectionner la conversation
                setSelectedConversation(conversation);
              }}
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
              // Afficher la conversation sélectionnée
              <ChatWindow
                conversationId={selectedConversation.id}
                isMobile={isMobile}
                apartmentId={selectedConversation.property?.[0]?.id || 'default'}
                whatsappContactId={selectedConversation.guest_phone || selectedConversation.guest_number}
                guestName={selectedConversation.guest_name}
                // Props temporairement commentées car interface mise à jour
                // guestNumber={selectedConversation.guest_number || ''}
                // conversationStartTime={selectedConversation.created_at || new Date().toISOString()}
                // onBack={handleBackFromChat}
              />
            ) : navValue === 'messages' ? (
              // Afficher la liste des conversations
              <Box sx={{ height: '100%', overflow: 'auto', p: 0 }}>
                <ConversationList
                  conversations={conversations}
                  onSelectConversation={(conversation) => {
                    // Marquer la conversation comme lue
                    if (conversation.unread_count && conversation.unread_count > 0) {
                      markConversationAsRead(conversation.id);
                    }
                    // Puis sélectionner la conversation
                    setSelectedConversation(conversation);
                  }}
                  onConversationUpdate={fetchConversations}
                />
              </Box>
            ) : navValue === 'apartments' ? (
              // Afficher la page Appartements (charger le contenu de la page properties ici)
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <Typography variant="h5" gutterBottom>Mes Appartements</Typography>
                <Typography variant="body1" paragraph>
                  Gérez vos propriétés et réservations.
                </Typography>
                
                {/* Liste des appartements */}
                <Box sx={{ mt: 3 }}>
                  <List>
                    <ListItem>
                      <Paper sx={{ p: 2, width: '100%' }}>
                        <Typography variant="h6">Loft Moderne Montmartre</Typography>
                        <Typography variant="body2" color="text.secondary">Paris, France</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                          <Button variant="outlined" size="small">Détails</Button>
                          <Button variant="contained" size="small">Réservations</Button>
                        </Box>
                      </Paper>
                    </ListItem>
                    <ListItem>
                      <Paper sx={{ p: 2, width: '100%' }}>
                        <Typography variant="h6">Studio Saint-Germain</Typography>
                        <Typography variant="body2" color="text.secondary">Paris, France</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                          <Button variant="outlined" size="small">Détails</Button>
                          <Button variant="contained" size="small">Réservations</Button>
                        </Box>
                      </Paper>
                    </ListItem>
                  </List>
                </Box>
              </Box>
            ) : navValue === 'urgency' ? (
              // Afficher la page Urgences
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <Typography variant="h5" gutterBottom>Urgences</Typography>
                <Typography variant="body1">
                  Notifications et situations nécessitant votre attention.
                </Typography>
                {/* Contenu des urgences */}
              </Box>
            ) : navValue === 'settings' ? (
              // Afficher la page Paramètres
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <Typography variant="h5" gutterBottom>Paramètres</Typography>
                <List>
                  <ListItem disablePadding>
                    <ListItemButton onClick={openWhatsAppConfig}>
                      <ListItemIcon><WhatsAppIcon /></ListItemIcon>
                      <ListItemText primary="Configuration WhatsApp" secondary="Gérez vos paramètres WhatsApp" />
                    </ListItemButton>
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                  <ListItem disablePadding>
                    <ListItemButton onClick={async () => {
                      try {
                        console.log('Test de notification FCM...');
                        await MobileNotificationService.sendTestNotification();
                        alert('Test de notification envoyé avec succès! Vérifiez la console pour plus de détails.');
                      } catch (error) {
                        console.error('Erreur lors du test de notification:', error);
                        alert(`Erreur lors du test: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
                      }
                    }}>
                      <ListItemIcon><NotificationsIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Tester les notifications" 
                        secondary="Envoyer une notification de test au token pré-configuré" />
                    </ListItemButton>
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                  {/* Autres options de paramètres */}
                </List>
              </Box>
            ) : (
              // Afficher le menu
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <List>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => setNavValue('apartments')}>
                      <ListItemIcon><ApartmentIcon /></ListItemIcon>
                      <ListItemText primary="Appartements" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => setNavValue('urgency')}>
                      <ListItemIcon><NotificationsIcon /></ListItemIcon>
                      <ListItemText primary="Urgences" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => setNavValue('messages')}>
                      <ListItemIcon>
                        <Badge 
                          badgeContent={conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0)} 
                          color="error"
                          max={99}
                        >
                          <ChatIcon />
                        </Badge>
                      </ListItemIcon>
                      <ListItemText primary="Messages" />
                    </ListItemButton>
                  </ListItem>
                  <Divider sx={{ my: 2 }} />
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => setNavValue('settings')}>
                      <ListItemIcon><SettingsIcon /></ListItemIcon>
                      <ListItemText primary="Paramètres" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton>
                      <ListItemIcon><HelpOutlineIcon /></ListItemIcon>
                      <ListItemText primary="Aide" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={handleSignOut}>
                      <ListItemIcon><LogoutIcon /></ListItemIcon>
                      <ListItemText primary="Déconnexion" />
                    </ListItemButton>
                  </ListItem>
                </List>
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
                // Props temporairement commentées car interface mise à jour
                // guestNumber={selectedConversation.guest_number || ''}
                // conversationStartTime={selectedConversation.created_at || new Date().toISOString()}
                // onBack={handleBackFromChat}
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
