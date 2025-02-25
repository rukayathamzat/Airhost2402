import { Box, Typography } from '@mui/material';

interface ChatHeaderProps {
  guestNumber: string;
  propertyName: string;
  conversationStartTime?: string;
}

export default function ChatHeader({ 
  guestNumber, 
  propertyName, 
  conversationStartTime 
}: ChatHeaderProps) {
  return (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">{guestNumber}</Typography>
          <Typography variant="body2" color="text.secondary">
            {propertyName}
          </Typography>
          {conversationStartTime && (
            <Typography variant="caption" color="text.secondary">
              Conversation démarrée le {new Date(conversationStartTime).toLocaleString()}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
