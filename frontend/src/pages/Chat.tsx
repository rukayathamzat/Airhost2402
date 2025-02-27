import { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Button, 
  Typography, 
  CircularProgress,
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

  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    fetchConversations();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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

  return (
    <Container maxWidth="xl" sx={{ height: '100vh', py: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={handleLogout} variant="contained" color="primary">Se déconnecter</Button>
      </Box>

      <Paper sx={{ 
        height: 'calc(100% - 48px)', 
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Liste des conversations */}
        <Box sx={{ 
          width: 360, 
          borderRight: 1, 
          borderColor: 'divider',
          overflow: 'auto'
        }}>
          <ConversationList
            conversations={conversations}
            onSelectConversation={setSelectedConversation}
          />
        </Box>

        {/* Fenêtre de chat */}
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'grey.50'
        }}>
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              guestNumber={selectedConversation.guest_number || ''}
              propertyName={selectedConversation.property[0].name}
              conversationStartTime={selectedConversation.created_at || new Date().toISOString()}
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
