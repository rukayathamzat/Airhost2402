import { useEffect, useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
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
  const [configOpen, setConfigOpen] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    fetchConversations();
    loadWhatsAppConfig();
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
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Dialog de configuration WhatsApp - conservé mais caché par défaut */}
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
      
      {/* Contenu principal - uniquement la partie dans le cadre rouge */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex',
        overflow: 'hidden',
        height: '100vh' // Assurer que ça prend toute la hauteur
      }}>
        {/* Liste des conversations */}
        <Box sx={{ 
          width: 320, 
          borderRight: 1, 
          borderColor: 'divider',
          overflow: 'auto',
          bgcolor: 'white'
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
          bgcolor: '#ffffff',
          overflow: 'hidden'
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary',
                p: 3,
                textAlign: 'center'
              }}
            >
              <img 
                src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png" 
                alt="Chat" 
                style={{ width: 120, height: 120, opacity: 0.5, marginBottom: 24 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucune conversation sélectionnée
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sélectionnez une conversation dans la liste pour commencer à discuter
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
