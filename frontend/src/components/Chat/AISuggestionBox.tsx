import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  IconButton, 
  Typography,
  Tooltip,
  Fade,
  Slide,
  alpha
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface AISuggestionBoxProps {
  suggestion: string;
  onSend: (suggestion: string) => void;
  onEdit: (editedSuggestion: string) => void;
  onClose: () => void;
  onRegenerate: () => void;
}

export default function AISuggestionBox({ 
  suggestion, 
  onSend, 
  onEdit, 
  onClose,
  onRegenerate 
}: AISuggestionBoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSuggestion, setEditedSuggestion] = useState(suggestion);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onEdit(editedSuggestion);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSuggestion(suggestion);
    setIsEditing(false);
  };

  return (
    <Slide direction="up" in={true} mountOnEnter unmountOnExit>
      <Fade in={true} timeout={300}>
        <Paper
          elevation={2}
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: alpha('#f8fafc', 0.95),
            border: '1px solid',
            borderColor: 'primary.light',
            borderRadius: 2,
            position: 'relative',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
              transform: 'translateY(-2px)'
            }
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 1.5,
              pb: 1,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: 'primary.light',
              borderRadius: 1,
              px: 1,
              py: 0.5
            }}>
              <AutoAwesomeIcon sx={{ color: 'primary.main', mr: 0.5, fontSize: 18 }} />
              <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 600 }}>
                Suggestion IA
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ 
                ml: 'auto', 
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'error.main'
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {isEditing ? (
            <Fade in={isEditing} timeout={200}>
              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={editedSuggestion}
                  onChange={(e) => setEditedSuggestion(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        }
                      }
                    }
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Tooltip title="Annuler">
                    <IconButton 
                      size="small" 
                      onClick={handleCancel}
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          color: 'error.main'
                        }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Enregistrer">
                    <IconButton 
                      size="small" 
                      onClick={handleSave}
                      sx={{
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          backgroundColor: 'primary.dark'
                        }
                      }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Fade>
          ) : (
            <Fade in={!isEditing} timeout={200}>
              <Box>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    mb: 2,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'text.primary',
                    lineHeight: 1.6,
                    px: 0.5
                  }}
                >
                  {suggestion}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  justifyContent: 'flex-end',
                  pt: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Tooltip title="Modifier">
                    <IconButton 
                      size="small" 
                      onClick={handleEdit}
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          color: 'primary.main'
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Régénérer">
                    <IconButton 
                      size="small" 
                      onClick={onRegenerate}
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          color: 'primary.main'
                        }
                      }}
                    >
                      <AutoAwesomeIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Envoyer">
                    <IconButton 
                      size="small" 
                      onClick={() => onSend(suggestion)}
                      sx={{
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          backgroundColor: 'primary.dark'
                        }
                      }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Fade>
          )}
        </Paper>
      </Fade>
    </Slide>
  );
} 