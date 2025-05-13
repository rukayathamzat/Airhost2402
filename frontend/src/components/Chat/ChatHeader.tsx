import { Box, Typography, Divider, Avatar, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChatHeaderProps {
  guestNumber: string;
  propertyName: string;
  conversationStartTime?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function ChatHeader({ 
  guestNumber, 
  propertyName, 
  conversationStartTime,
  showBackButton = false,
  onBack
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
        p: { xs: 1.5, sm: 2 }, 
        display: 'flex', 
        alignItems: 'center', 
        gap: { xs: 1, sm: 2 },
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {showBackButton && (
          <IconButton 
            onClick={onBack} 
            size="small"
            sx={{ 
              mr: 0.5,
              color: '#3b82f6'
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        <Avatar 
          sx={{ 
            bgcolor: '#3b82f6',
            width: { xs: 36, sm: 40 },
            height: { xs: 36, sm: 40 },
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}
        >
          {guestNumber.substring(0, 2)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="subtitle1" 
            fontWeight={600}
            sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
          >
            {formatPhoneNumber(guestNumber)}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            {propertyName}
          </Typography>
          {conversationStartTime && (
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                display: { xs: 'none', sm: 'block' } 
              }}
            >
              Conversation démarrée le {format(new Date(conversationStartTime), 'PPP', { locale: fr })}
            </Typography>
          )}
        </Box>
      </Box>
      <Divider />
    </>
  );
}