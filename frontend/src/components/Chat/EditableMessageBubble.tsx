import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, IconButton, Tooltip, useTheme } from '@mui/material';
import { Edit, Send, Refresh } from '@mui/icons-material';
import { format } from 'date-fns';
import { Message } from '../../services/chat/message.service';

interface EditableMessageBubbleProps {
  message: Message;
  onSend: (content: string) => void;
  onRegenerateRequest?: () => void;
  isEditable?: boolean;
}

export default function EditableMessageBubble({
  message,
  onSend,
  onRegenerateRequest,
  isEditable = false
}: EditableMessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content || '');
  const theme = useTheme();
  const isInbound = message.direction === 'inbound';

  // Mettre à jour le contenu édité lorsque le message change
  useEffect(() => {
    setEditedContent(message.content || '');
  }, [message.content]);

  // Activer l'édition si le message est éditable par défaut
  useEffect(() => {
    if (isEditable && !isInbound) {
      setIsEditing(true);
    }
  }, [isEditable, isInbound]);

  const handleSend = () => {
    if (editedContent.trim()) {
      onSend(editedContent);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Les messages entrants (inbound) ne sont jamais éditables
  if (isInbound) {
    return (
      <Tooltip 
        title={format(new Date(message.created_at), 'HH:mm')}
        placement="right"
        arrow
      >
        <Paper
          sx={{
            p: 1.5,
            borderRadius: 2,
            maxWidth: '100%',
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            wordBreak: 'break-word',
            boxShadow: theme.shadows[1]
          }}
        >
          <Typography variant="body1">
            {message.content}
          </Typography>
        </Paper>
      </Tooltip>
    );
  }

  // Mode édition pour les messages sortants (outbound)
  if (isEditing) {
    return (
      <Paper
        sx={{
          p: 1.5,
          borderRadius: 2,
          maxWidth: '100%',
          backgroundColor: theme.palette.info.light, // Couleur différente pour le mode édition
          color: theme.palette.getContrastText(theme.palette.info.light),
          boxShadow: theme.shadows[1],
          border: `1px dashed ${theme.palette.info.main}`
        }}
      >
        <TextField
          fullWidth
          multiline
          variant="standard"
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          InputProps={{
            disableUnderline: true,
            style: {
              color: theme.palette.getContrastText(theme.palette.info.light),
              fontSize: '1rem',
              fontFamily: 'inherit'
            }
          }}
          sx={{
            '& .MuiInputBase-root': {
              padding: 0
            }
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          {onRegenerateRequest && (
            <IconButton 
              size="small" 
              onClick={onRegenerateRequest}
              sx={{ 
                color: theme.palette.getContrastText(theme.palette.info.light), 
                opacity: 0.8, 
                mr: 1 
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          )}
          <IconButton 
            size="small" 
            onClick={handleSend}
            sx={{ color: theme.palette.getContrastText(theme.palette.info.light) }}
          >
            <Send fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
    );
  }

  // Mode affichage pour les messages sortants (outbound)
  return (
    <Tooltip 
      title={format(new Date(message.created_at), 'HH:mm')}
      placement="left"
      arrow
    >
      <Paper
        sx={{
          p: 1.5,
          borderRadius: 2,
          maxWidth: '100%',
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          wordBreak: 'break-word',
          boxShadow: theme.shadows[1],
          position: 'relative'
        }}
      >
        <Typography variant="body1">
          {message.content}
        </Typography>
        {!isInbound && (
          <IconButton 
            size="small" 
            onClick={() => setIsEditing(true)}
            sx={{ 
              position: 'absolute',
              top: -16,
              right: -16,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.background.default
              },
              width: 28,
              height: 28
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
        )}
      </Paper>
    </Tooltip>
  );
}
