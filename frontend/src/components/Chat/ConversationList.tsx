import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Box, List, ListItem, ListItemText, Typography, Badge } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Conversation {
  id: string;
  guest_name: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  last_message_at: string;
  property: {
    name: string;
  };
}

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

  return (
    <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        Conversations
      </Typography>
      <List>
        {conversations.map((conversation) => (
          <ListItem
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:hover': {
                bgcolor: 'action.hover',
              },
              cursor: 'pointer'
            }}
          >
            <ListItemText
              primaryTypographyProps={{
                component: 'div',
                sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
              }}
              primary={
                <>
                  <span>{conversation.guest_name}</span>
                  <span style={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                    {conversation.guest_phone}
                  </span>
                </>
              }
              secondaryTypographyProps={{
                component: 'div'
              }}
              secondary={
                <>
                  <div style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontSize: '0.875rem'
                  }}>
                    {conversation.property?.name}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    color: 'rgba(0, 0, 0, 0.6)',
                    fontSize: '0.75rem'
                  }}>
                    <span>
                      Check-in: {new Date(conversation.check_in_date).toLocaleDateString()}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </span>
                  </div>
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
