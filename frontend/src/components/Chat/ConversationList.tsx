import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Avatar, 
  Badge,
  Divider
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Conversation } from '../../types/conversation';

interface ConversationListProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onConversationUpdate?: () => void;  // Callback optionnel pour notifier le parent des mises à jour
}

export default function ConversationList({ conversations, onSelectConversation, onConversationUpdate }: ConversationListProps) {
  useEffect(() => {
    // Souscrire aux changements en temps réel
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Configuration de la souscription Realtime dans ConversationList`);
    
    // Utiliser un nom de canal plus spécifique pour éviter les conflits
    const channel = supabase
      .channel('public:conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          const updateTimestamp = new Date().toISOString();
          console.log(`[${updateTimestamp}] REALTIME: Changement détecté dans les conversations:`, payload);
          console.log(`[${updateTimestamp}] REALTIME: Type d'événement:`, payload.eventType);
          console.log(`[${updateTimestamp}] REALTIME: Données:`, payload.new);
          
          // Vérifier si les données de payload sont valides
          if (payload.new && payload.eventType) {
            // Notifier le composant parent pour qu'il rafraîchisse les données
            if (onConversationUpdate) {
              console.log(`[${updateTimestamp}] REALTIME: Notification au parent pour mise à jour des conversations`);
              onConversationUpdate();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[${new Date().toISOString()}] Status de la souscription conversations:`, status);
      });

    return () => {
      console.log(`[${new Date().toISOString()}] Nettoyage de la souscription ConversationList`);
      supabase.removeChannel(channel);
    };
  }, [onConversationUpdate]); // Ajouter onConversationUpdate comme dépendance
  
  // Effet pour le débogage des changements dans la liste des conversations
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`RENDU: Liste des conversations mise à jour [${timestamp}]:`, conversations.map(c => ({
      id: c.id,
      guest_name: c.guest_name,
      last_message: c.last_message,
      last_message_at: c.last_message_at,
      _refreshTimestamp: c._refreshTimestamp
    })));
  }, [conversations]);

  // Fonction pour générer les initiales à partir du nom
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {conversations.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          p: 3,
          height: '100%',
          textAlign: 'center'
        }}>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Aucune conversation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Les nouvelles conversations apparaîtront ici
          </Typography>
        </Box>
      ) : (
        <List sx={{ width: '100%', p: 0, overflowY: 'auto' }}>
          {conversations.map((conversation) => (
            <div key={`${conversation.id}-${conversation._refreshTimestamp || 'initial'}`}>
              <ListItem
                onClick={() => onSelectConversation(conversation)}
                sx={{
                  py: 2,
                  px: 2,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                  cursor: 'pointer'
                }}
              >
                <Badge
                  badgeContent={conversation.unread_count || 0}
                  color="primary"
                  invisible={!conversation.unread_count}
                  overlap="circular"
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  sx={{ 
                    mr: 2,
                    '& .MuiBadge-badge': {
                      fontSize: '0.75rem',
                      height: '20px',
                      minWidth: '20px',
                      padding: '0 6px',
                      borderRadius: '10px',
                    }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: conversation.unread_count ? '#3b82f6' : '#94a3b8',
                      width: 48,
                      height: 48
                    }}
                  >
                    {getInitials(conversation.guest_name)}
                  </Avatar>
                </Badge>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={conversation.unread_count ? 600 : 400}>
                        {conversation.guest_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {formatDistanceToNow(new Date(conversation.last_message_at), {
                          addSuffix: true,
                          locale: fr
                        })}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px',
                          fontWeight: conversation.unread_count ? 600 : 400,
                          color: conversation.unread_count ? 'text.primary' : 'text.secondary'
                        }}
                      >
                        {conversation.last_message || 'Nouvelle conversation'}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}
                      >
                        {conversation.property[0]?.name}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <Divider />
            </div>
          ))}
        </List>
      )}
    </Box>
  );
}
