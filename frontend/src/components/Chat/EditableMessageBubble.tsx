import React, { useState } from 'react';
import { Box, IconButton, TextField, Typography } from '@mui/material';
import { Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { Message } from '../../services/chat/message.service';

interface EditableMessageBubbleProps {
  message: Message;
  onSave: (id: string, content: string) => void;
  onCancel: () => void;
  onSend?: (content: string) => void;
  onRegenerateRequest?: () => void;
  isEditable?: boolean;
}

/**
 * Composant de bulle de message éditable
 * Permet de modifier le contenu d'un message
 */
const EditableMessageBubble: React.FC<EditableMessageBubbleProps> = ({ 
  message, 
  onSave, 
  onCancel 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleSave = () => {
    onSave(message.id, editedContent);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditedContent(message.content);
    setIsEditing(false);
    onCancel();
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedContent(e.target.value);
  };
  
  // Déterminer la couleur de la bulle en fonction du type d'expéditeur
  const getBubbleColor = () => {
    switch (message.sender_type) {
      case 'user':
        return '#e3f2fd'; // Bleu clair
      case 'assistant':
        return '#f1f8e9'; // Vert clair
      case 'system':
        return '#f5f5f5'; // Gris clair
      default:
        return '#f5f5f5';
    }
  };
  
  // Formater le contenu du message pour préserver les sauts de ligne
  const formatContent = (content: string) => {
    // Remplacer les sauts de ligne par des balises <br />
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: message.sender_type === 'user' ? 'flex-end' : 'flex-start',
        mb: 1,
        width: '100%'
      }}
    >
      <Box
        sx={{
          backgroundColor: getBubbleColor(),
          borderRadius: 2,
          p: 1.5,
          maxWidth: '80%',
          position: 'relative'
        }}
      >
        {isEditing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <TextField
              fullWidth
              multiline
              variant="outlined"
              value={editedContent}
              onChange={handleChange}
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton size="small" onClick={handleCancel} sx={{ mr: 1 }}>
                <CloseIcon />
              </IconButton>
              <IconButton size="small" onClick={handleSave} color="primary">
                <CheckIcon />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {formatContent(message.content)}
            </Typography>
            {message.sender_type === 'user' && (
              <IconButton
                size="small"
                onClick={handleEdit}
                sx={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  backgroundColor: 'white',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </>
        )}
      </Box>
      <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary' }}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Typography>
    </Box>
  );
};

export default EditableMessageBubble;
