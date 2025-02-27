import { Box, Typography, Divider, Avatar } from '@mui/material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  // Formater le numéro de téléphone pour l'affichage
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Format international: +33 6 12 34 56 78
    if (phone.startsWith('+')) {
      const cleaned = phone.replace(/\D/g, '');
      const match = cleaned.match(/^(\d{2})(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})$/);
      if (match) {
        return `+${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]} ${match[6]}`;
      }
    }
    return phone;
  };

  return (
    <>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <Avatar 
          sx={{ 
            bgcolor: '#3b82f6',
            width: 40,
            height: 40
          }}
        >
          {guestNumber.substring(0, 2)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {formatPhoneNumber(guestNumber)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {propertyName}
          </Typography>
          {conversationStartTime && (
            <Typography variant="caption" color="text.secondary">
              Conversation démarrée le {format(new Date(conversationStartTime), 'PPP', { locale: fr })}
            </Typography>
          )}
        </Box>
      </Box>
      <Divider />
    </>
  );
}