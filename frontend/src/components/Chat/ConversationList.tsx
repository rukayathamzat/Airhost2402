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
}

export default function ConversationList({ conversations, onSelectConversation }: ConversationListProps) {
  useEffect(() => {
    // Souscrire aux changements en temps réel
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Changement dans les conversations:', payload);
          // La mise à jour sera gérée par le composant parent
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fonction pour générer les initiales à partir du nom
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Typography variant="h6" fontWeight={600}>
          Conversations
        </Typography>
      </Box>
      
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
            <div key={conversation.id}>
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
                  color="primary"
                  variant="dot"
                  invisible={!conversation.unread_count}
                  overlap="circular"
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  sx={{ mr: 2 }}
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
