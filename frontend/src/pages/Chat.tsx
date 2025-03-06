import { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Button, 
  Typography, 
  CircularProgress,
  useMediaQuery,
  useTheme
} from '@mui/material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    fetchConversations();
    
    // Mettre en place la souscription pour les nouvelles conversations
    const setupRealtimeSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      console.log('Mise en place de la souscription pour les nouvelles conversations');
      const channel = supabase
        .channel('new-conversations')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversations',
            filter: `property.host_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('Nouvelle conversation détectée:', payload.new);
            // Recharger toutes les conversations pour s'assurer d'avoir les données complètes
            fetchConversations();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations'
          },
          (payload) => {
            console.log('Conversation mise à jour:', payload.new);
            // Mettre à jour la conversation dans la liste locale
            setConversations(current => {
              const updated = [...current];
              const index = updated.findIndex(c => c.id === payload.new.id);
              if (index >= 0) {
                updated[index] = { ...updated[index], ...payload.new };
              }
              return updated;
            });
          }
        )
        .subscribe();
      
      return () => {
        console.log('Nettoyage de la souscription aux conversations');
        supabase.removeChannel(channel);
      };
    };
    
    const cleanup = setupRealtimeSubscription();
    return () => {
      if (cleanup) cleanup.then(fn => fn && fn());
    };
  }, []);

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

      console.log('Récupération des conversations pour:', session.user.id);
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
          last_message_at
        `)
        .eq('property.host_id', session.user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      console.log('Conversations récupérées:', data);
      setConversations(data?.map(item => ({
        ...item,
        property: Array.isArray(item.property) ? item.property : [item.property]
      })) || []);
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

  return (
    <Container maxWidth="xl" sx={{ height: '100vh', py: 3 }}>
      <Paper sx={{ 
        height: '100%', 
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Liste des conversations - cachée en mobile quand une conversation est sélectionnée */}
        <Box sx={{ 
          width: 360, 
          borderRight: 1, 
          borderColor: 'divider',
          overflow: 'auto',
          display: (isMobile && selectedConversation) ? 'none' : 'block',
          flexShrink: 0
        }}>
          <ConversationList
            conversations={conversations}
            onSelectConversation={setSelectedConversation}
          />
        </Box>

        {/* Fenêtre de chat - plein écran en mobile, cachée si aucune conversation n'est sélectionnée */}
        <Box sx={{ 
          flexGrow: 1,
          display: (isMobile && !selectedConversation) ? 'none' : 'flex',
          flexDirection: 'column',
          bgcolor: 'grey.50',
          height: '100%'
        }}>
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

    </Container>
  );
}
