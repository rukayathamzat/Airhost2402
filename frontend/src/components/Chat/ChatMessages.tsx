import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Chip, Avatar, Tooltip, useTheme, CircularProgress } from '@mui/material';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Message } from '../../services/chat/message.service';

// Préfixe pour les logs liés à ce composant
const DEBUG_PREFIX = 'DEBUG_CHAT_MESSAGES';

interface ChatMessagesProps {
  messages: Message[];
  isInitialLoad: boolean;
}

export default function ChatMessages({ messages, isInitialLoad }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loadingState, setLoadingState] = useState(isInitialLoad);
  const theme = useTheme();
  
  // Log important pour déboguer
  console.log(`${DEBUG_PREFIX} Re-rendu avec ${messages.length} messages`);
  
  // Afficher les IDs des 5 premiers messages pour débogage
  if (messages.length > 0) {
    const messagesToLog = messages.slice(0, Math.min(5, messages.length));
    console.log(`${DEBUG_PREFIX} Premiers messages:`, messagesToLog.map(m => ({ id: m.id, content: m.content })));
  }

  // Fonction pour formater la date du message
  const formatMessageDate = (date: string): string => {
    try {
      const messageDate = new Date(date);
      if (isToday(messageDate)) {
        return "Aujourd'hui";
      } else if (isYesterday(messageDate)) {
        return "Hier";
      } else {
        return format(messageDate, 'EEEE d MMMM', { locale: fr });
      }
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors du formatage de la date:`, error, date);
      return 'Date inconnue';
    }
  };

  // Défilement automatique vers le bas
  const scrollToBottom = (instant = false) => {
    try {
      messagesEndRef.current?.scrollIntoView({
        behavior: instant ? 'auto' : 'smooth'
      });
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur lors du défilement:`, error);
    }
  };

  // Effet pour le défilement automatique
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} useEffect déclenché - messages.length: ${messages.length}, isInitialLoad: ${isInitialLoad}`);
    
    if (messages.length > 0) {
      if (isInitialLoad) {
        console.log(`${DEBUG_PREFIX} Chargement initial - défilement immédiat`);
        scrollToBottom(true);
        // Délai pour simuler le chargement et améliorer l'UX
        const timer = setTimeout(() => {
          setLoadingState(false);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        const scrollContainer = messagesEndRef.current?.parentElement;
        if (scrollContainer) {
          try {
            const isAtBottom = Math.abs(
              (scrollContainer.scrollHeight - scrollContainer.scrollTop) - scrollContainer.clientHeight
            ) < 50;
            
            console.log(`${DEBUG_PREFIX} État du défilement:`, { 
              scrollHeight: scrollContainer.scrollHeight,
              scrollTop: scrollContainer.scrollTop,
              clientHeight: scrollContainer.clientHeight,
              isAtBottom
            });
            
            if (isAtBottom) {
              scrollToBottom();
            }
          } catch (error) {
            console.error(`${DEBUG_PREFIX} Erreur lors du calcul de la position de défilement:`, error);
          }
        }
      }
    }
  }, [messages, isInitialLoad]);

  // Fonction pour créer des groupes de messages par date
  const createMessageGroups = () => {
    console.log(`${DEBUG_PREFIX} Création des groupes de messages, ${messages.length} messages`); 
    
    if (!Array.isArray(messages)) {
      console.error(`${DEBUG_PREFIX} messages n'est pas un tableau:`, messages);
      return [];
    }
    
    try {
      return messages.reduce((messageGroups: React.ReactNode[], message, index) => {
        // Vérifier que le message est valide
        if (!message || !message.created_at) {
          console.error(`${DEBUG_PREFIX} Message invalide:`, message);
          return messageGroups;
        }
        
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
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.secondary,
                  fontWeight: 500,
                  boxShadow: theme.shadows[1],
                  zIndex: 1
                }}
              />
            </Box>
          );
        }
        
        // Ajouter le message actuel au groupe
        const isFromGuest = message.is_from_guest;
        
        // Déterminer si c'est le dernier message d'une série du même expéditeur
        const isLastMessageFromSender = index === messages.length - 1 || 
          messages[index + 1]?.is_from_guest !== message.is_from_guest;

        // Déterminer s'il s'agit d'un message consécutif du même expéditeur
        const isConsecutive = index > 0 && messages[index - 1].is_from_guest === message.is_from_guest;

        messageGroups.push(
          <Box 
            key={message.id} 
            sx={{
              display: 'flex',
              justifyContent: isFromGuest ? 'flex-start' : 'flex-end',
              mb: 1
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: isFromGuest ? 'row' : 'row-reverse',
                alignItems: 'flex-end',
                maxWidth: '75%'
              }}
            >
              {isFromGuest && (
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    ml: isFromGuest ? 0 : 1,
                    mr: isFromGuest ? 1 : 0,
                    bgcolor: theme.palette.primary.light
                  }}
                >
                  G
                </Avatar>
              )}

              <Tooltip 
                title={format(new Date(message.created_at), 'HH:mm')}
                placement={isFromGuest ? 'right' : 'left'}
                arrow
              >
                <Paper
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    maxWidth: '100%',
                    backgroundColor: isFromGuest 
                      ? theme.palette.background.paper
                      : theme.palette.primary.main,
                    color: isFromGuest
                      ? theme.palette.text.primary
                      : theme.palette.primary.contrastText,
                    wordBreak: 'break-word',
                    boxShadow: theme.shadows[1],
                  }}
                >
                  <Typography variant="body1">
                    {message.content}
                  </Typography>
                </Paper>
              </Tooltip>
            </Box>
          </Box>
        );
        
        return messageGroups;
      }, []);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Erreur dans createMessageGroups:`, error);
      return [];
    }
  };
  
  // Générer les groupes de messages
  const messageElements = createMessageGroups();

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
          {/* Debug info pour visualiser les problèmes */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {`${messages.length} messages chargés`}
            </Typography>
          </Box>
          
          {/* Afficher les éléments de message */}
          {messageElements.length > 0 ? (
            messageElements
          ) : (
            // Afficher un message de débogage si les éléments ne sont pas générés alors que des messages existent
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="error">
                Problème d'affichage - {messages.length} messages en mémoire
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={20} />
              </Box>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </Box>
      )}
    </Box>
  );
}
