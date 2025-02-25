import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
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
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }}>
      {messages.map((message) => (
        <Box
          key={message.id}
          sx={{
            display: 'flex',
            justifyContent: message.direction === 'outbound' ? 'flex-end' : 'flex-start',
            mb: 1
          }}
        >
          <Box
            sx={{
              maxWidth: '70%',
              p: 2,
              borderRadius: 2,
              bgcolor: message.direction === 'outbound' ? 'primary.main' : 'grey.100',
              color: message.direction === 'outbound' ? 'white' : 'text.primary'
            }}
          >
            <Typography variant="body1">{message.content}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              {new Date(message.created_at).toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
}
