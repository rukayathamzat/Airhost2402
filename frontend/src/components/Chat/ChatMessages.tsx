import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Chip, Avatar, Skeleton, Tooltip, useTheme } from '@mui/material';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Message } from '../../services/chat/message.service';

interface ChatMessagesProps {
  messages: Message[];
  isInitialLoad: boolean;
}

export default function ChatMessages({ messages, isInitialLoad }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loadingState, setLoadingState] = useState(isInitialLoad);
  const theme = useTheme();

  // Fonction pour formater la date du message
  const formatMessageDate = (date: string): string => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return "Aujourd'hui";
    } else if (isYesterday(messageDate)) {
      return "Hier";
    } else {
      return format(messageDate, 'EEEE d MMMM', { locale: fr });
    }
  };

  // Défilement automatique vers le bas
  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: instant ? 'auto' : 'smooth'
    });
  };

  // Effet pour le défilement automatique
  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        scrollToBottom(true);
        // Délai pour simuler le chargement et améliorer l'UX
        const timer = setTimeout(() => {
          setLoadingState(false);
        }, 500);
        return () => clearTimeout(timer);
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
    <Box>
      {messages.length === 0 ? (
        // Affichage d'un message lorsqu'il n'y a pas de conversations
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          p: 3,
          my: 4
        }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Aucun message
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Envoyez un message pour démarrer la conversation
          </Typography>
        </Box>
      ) : (
        // Affichage des messages
        <Box sx={{ width: '100%' }}>
          {/* Utilisation d'un groupement par date */}
          {messages.reduce((messageGroups, message, index) => {
            // Vérifier si un nouveau groupe de date est nécessaire
            const showDateSeparator = index === 0 || !isSameDay(
              new Date(message.created_at),
              new Date(messages[index - 1].created_at)
            );
            
            // Si nécessaire, ajouter un séparateur de date
            if (showDateSeparator) {
              messageGroups.push(
                <Box 
                  key={`date-${message.id}`} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    mb: 3, 
                    mt: index > 0 ? 3 : 1,
                    position: 'relative'
                  }}
                >
                  <Chip
                    label={formatMessageDate(message.created_at)}
                    size="small"
                    sx={{ 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666',
                      fontSize: '0.7rem',
                      fontWeight: 500
                    }}
                  />
                </Box>
              );
            }

            // Ajouter le message courant avec animation de chargement conditionnelle
            const isLastMessageFromSender = index === messages.length - 1 || 
              messages[index + 1]?.direction !== message.direction;
            
            const isOutbound = message.direction === 'outbound';
            
            // Déterminer s'il s'agit d'un message consécutif du même expéditeur
            const isConsecutive = index > 0 && messages[index - 1].direction === message.direction;
            
            messageGroups.push(
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  flexDirection: isOutbound ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  mb: isLastMessageFromSender ? 1.5 : 0.5,
                  mt: isConsecutive ? 0.5 : 1.5,
                  opacity: loadingState ? 0.7 : 1,
                  transform: `translateY(${loadingState ? '10px' : '0'})`,
                  transition: 'opacity 0.3s ease, transform 0.3s ease'
                }}
              >
                {/* Avatar pour les messages entrants (et uniquement pour le dernier message d'une série) */}
                {!isOutbound && isLastMessageFromSender && (
                  <Avatar 
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      mr: 1,
                      bgcolor: '#9ca3af',
                      fontSize: '0.75rem',
                      display: { xs: 'none', sm: 'flex' }
                    }}
                  >
                    G
                  </Avatar>
                )}
                
                {/* Message avec un espacement différent selon que c'est un message consécutif du même expéditeur */}
                <Paper
                  elevation={0}
                  sx={{
                    maxWidth: { xs: '85%', sm: '65%' },
                    p: { xs: 1.5, sm: 2 },
                    px: { xs: 2, sm: 2.5 },
                    borderRadius: 2.5,
                    ml: !isOutbound && !isLastMessageFromSender ? { xs: 0, sm: 4.5 } : 0,
                    mr: isOutbound && !isLastMessageFromSender ? 0.5 : 0,
                    bgcolor: isOutbound 
                      ? theme.palette.primary.main 
                      : theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#ffffff',
                    color: isOutbound ? '#ffffff' : 'text.primary',
                    boxShadow: theme.palette.mode === 'dark' 
                      ? '0 2px 8px rgba(0,0,0,0.25)' 
                      : '0 1px 3px rgba(0,0,0,0.1)',
                    position: 'relative',
                    '&::before': isOutbound ? {
                      content: '""',
                      position: 'absolute',
                      right: -6,
                      bottom: 8,
                      width: 12,
                      height: 12,
                      backgroundColor: theme.palette.primary.main,
                      transform: 'rotate(45deg)',
                      display: isLastMessageFromSender ? 'block' : 'none'
                    } : {}
                  }}
                >
                  {loadingState ? (
                    <Skeleton variant="text" width={200} height={20} />
                  ) : (
                    <>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          wordBreak: 'break-word',
                          fontSize: { xs: '0.95rem', sm: '1rem' },
                          lineHeight: 1.5,
                          fontWeight: 400
                        }}
                      >
                        {message.content}
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        alignItems: 'center',
                        mt: 0.5 
                      }}>
                        <Tooltip title={format(new Date(message.created_at), 'PPP à HH:mm', { locale: fr })}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              opacity: 0.75,
                              fontSize: '0.65rem',
                              ml: 0.5
                            }}
                          >
                            {format(new Date(message.created_at), 'HH:mm')}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </>
                  )}
                </Paper>
              </Box>
            );

            return messageGroups;

          }, [] as JSX.Element[])}
        </Box>
      )}
      <div ref={messagesEndRef} style={{ height: 1 }} />
    </Box>
  );
}