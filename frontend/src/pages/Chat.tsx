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
  Drawer,
  BottomNavigation,
  BottomNavigationAction,
  Badge
} from '@mui/material';
// Import MenuIcon supprimé car non utilisé
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CampaignIcon from '@mui/icons-material/Campaign';
import ChatIcon from '@mui/icons-material/Chat';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import ConversationList from '../components/Chat/ConversationList';
import ChatWindow from '../components/Chat/ChatWindow';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

import { Conversation } from '../types/conversation';

export default function Chat() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navValue, setNavValue] = useState('messages');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
          property:properties!inner(name, host_id),
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

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
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
        {/* Drawer en mode mobile */}
        {isMobile ? (
          <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={toggleDrawer}
            sx={{
              '& .MuiDrawer-paper': {
                width: '85%',
                maxWidth: 360,
                height: '100%',
                boxSizing: 'border-box',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              <IconButton onClick={toggleDrawer} size="large">
                <CloseIcon />
              </IconButton>
            </Box>
            <ConversationList
              conversations={conversations}
              onSelectConversation={(conversation) => {
                setSelectedConversation(conversation);
                setDrawerOpen(false);
              }}
              onConversationUpdate={fetchConversations}
            />
          </Drawer>
        ) : (
          // Version desktop: Liste des conversations sur le côté
          <Box sx={{ 
            width: 360, 
            borderRight: 1, 
            borderColor: 'divider',
            overflow: 'auto',
            flexShrink: 0
          }}>
            <ConversationList
              conversations={conversations}
              onSelectConversation={setSelectedConversation}
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
          {/* AppBar en mode mobile avec le titre uniquement, plus de menu hamburger */}
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
                    <CloseIcon />
                  </IconButton>
                )}
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 500 }}>
                  {selectedConversation ? selectedConversation.guest_name : 'Conversations'}
                </Typography>
              </Toolbar>
            </AppBar>
          )}
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              guestNumber={selectedConversation.guest_number || ''}
              propertyName={selectedConversation.property[0].name}
              conversationStartTime={selectedConversation.created_at || new Date().toISOString()}
              isMobile={isMobile}
              onBack={handleBackFromChat}
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
          )}
        </Box>
      </Paper>

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
              // Si on clique sur Messages et qu'on n'est pas déjà dans la vue des messages, ouvrir le drawer
              if (newValue === 'messages' && !selectedConversation) {
                setDrawerOpen(true);
              }
            }}
            showLabels
            sx={{ height: 56 }}
          >
            <BottomNavigationAction 
              label="Aujourd'hui" 
              value="home"
              icon={<HomeIcon />} 
              sx={{ minWidth: 'auto' }}
            />
            <BottomNavigationAction 
              label="Calendrier" 
              value="calendar"
              icon={<CalendarMonthIcon />} 
              sx={{ minWidth: 'auto' }}
            />
            <BottomNavigationAction 
              label="Annonces" 
              value="listings"
              icon={<CampaignIcon />} 
              sx={{ minWidth: 'auto' }}
            />
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
              label="Menu" 
              value="menu"
              icon={<MenuOpenIcon />} 
              sx={{ minWidth: 'auto' }}
              onClick={() => setDrawerOpen(true)}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Container>
  );
}
