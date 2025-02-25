import { useState } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Tooltip 
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
    <Box sx={{ 
      p: 2, 
      borderTop: 1, 
      borderColor: 'divider',
      display: 'flex',
      gap: 1,
      alignItems: 'center'
    }}>
      <Tooltip title="Générer une réponse IA">
        <IconButton 
          onClick={onOpenAIModal}
          disabled={disabled}
          sx={{ color: 'primary.main' }}
        >
          <AutoAwesomeIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Envoyer un template">
        <IconButton 
          onClick={onOpenTemplates}
          disabled={disabled}
          sx={{ color: 'primary.main' }}
        >
          <WhatsAppIcon />
        </IconButton>
      </Tooltip>

      <TextField
        fullWidth
        multiline
        maxRows={4}
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Écrivez votre message..."
        disabled={disabled}
        sx={{ flex: 1 }}
      />

      <Tooltip title="Envoyer">
        <IconButton 
          onClick={handleSend}
          disabled={disabled || !newMessage.trim()}
          color="primary"
        >
          <SendIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
