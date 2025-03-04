import { useEffect, useRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { format } from 'date-fns';
import { Message } from '../../services/chat/message.service';

interface ChatMessagesProps {
  messages: Message[];
  isInitialLoad: boolean;
}

export default function ChatMessages({ messages, isInitialLoad }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: instant ? 'auto' : 'smooth'
    });
  };

  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        scrollToBottom(true);
      } else {
        const scrollContainer = messagesEndRef.current?.parentElement;
        if (scrollContainer) {
          const isAtBottom = Math.abs(
            (scrollContainer.scrollHeight - scrollContainer.scrollTop) - scrollContainer.clientHeight
          ) < 50;
          if (isAtBottom) {
            scrollToBottom();
          }
        }
      }
    }
  }, [messages, isInitialLoad]);

  return (
    <Box sx={{ 
      flexGrow: 1, 
      overflowY: 'auto', 
      overflowX: 'hidden',
      p: { xs: 1, sm: 2 },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      backgroundColor: '#f8f9fa',
      height: { 
        xs: 'calc(100vh - 120px)', 
        sm: 'calc(100% - 120px)' 
      },
      flex: 1,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {messages.map((message) => (
        <Box
          key={message.id}
          sx={{
            display: 'flex',
            justifyContent: message.direction === 'outbound' ? 'flex-end' : 'flex-start',
            mb: 0.5
          }}
        >
          <Paper
            elevation={0}
            sx={{
              maxWidth: { xs: '85%', sm: '70%' },
              p: { xs: 1, sm: 1.5 },
              borderRadius: 2,
              bgcolor: message.direction === 'outbound' ? '#3b82f6' : '#ffffff',
              color: message.direction === 'outbound' ? 'white' : 'text.primary',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                wordBreak: 'break-word',
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              {message.content}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block',
                textAlign: 'right',
                mt: 0.5,
                opacity: 0.8,
                fontSize: { xs: '0.65rem', sm: '0.7rem' }
              }}
            >
              {format(new Date(message.created_at), 'HH:mm')}
            </Typography>
          </Paper>
        </Box>
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
}