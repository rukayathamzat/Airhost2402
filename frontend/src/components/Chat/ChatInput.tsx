import { useState } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Tooltip,
  Paper,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  onOpenAIModal: () => void;
  onOpenTemplates: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}

export default function ChatInput({ 
  onSendMessage, 
  onOpenAIModal, 
  onOpenTemplates,
  disabled 
}: ChatInputProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await onSendMessage(newMessage);
    setNewMessage('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 1.5, 
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: '#fff'
      }}
    >
      <Box sx={{ 
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        borderRadius: 2,
        backgroundColor: '#f8f9fa',
        p: 0.5
      }}>
        <Tooltip title="Générer une réponse IA">
          <IconButton 
            onClick={onOpenAIModal}
            disabled={disabled}
            sx={{ 
              color: '#3b82f6',
              '&.Mui-disabled': {
                color: 'rgba(0, 0, 0, 0.26)'
              }
            }}
            size="medium"
          >
            <AutoAwesomeIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Envoyer un template">
          <IconButton 
            onClick={onOpenTemplates}
            disabled={disabled}
            sx={{ 
              color: '#3b82f6',
              '&.Mui-disabled': {
                color: 'rgba(0, 0, 0, 0.26)'
              }
            }}
            size="medium"
          >
            <WhatsAppIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Écrivez votre message..."
          disabled={disabled}
          variant="standard"
          InputProps={{
            disableUnderline: true
          }}
          sx={{ 
            flex: 1,
            '& .MuiInputBase-root': {
              padding: '8px 12px',
              fontSize: '0.95rem'
            }
          }}
        />

        <Tooltip title="Envoyer">
          <span>
            <IconButton 
              onClick={handleSend}
              disabled={disabled || !newMessage.trim()}
              color="primary"
              sx={{
                bgcolor: newMessage.trim() ? '#3b82f6' : 'transparent',
                color: newMessage.trim() ? 'white' : 'rgba(0, 0, 0, 0.26)',
                '&:hover': {
                  bgcolor: newMessage.trim() ? '#2563eb' : 'transparent'
                },
                '&.Mui-disabled': {
                  bgcolor: 'transparent',
                  color: 'rgba(0, 0, 0, 0.26)'
                }
              }}
            >
              <SendIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Paper>
  );
}