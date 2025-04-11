import { 
  Menu, 
  MenuItem, 
  ListItemText,
  Divider,
  Typography,
  Box,
  Button,
  Stack,
  Tooltip
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Template } from '../../../services/chat/template.service';

interface TemplateMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  templates: Template[];
  onSelectTemplate: (template: Template) => void;
  // Nouvelle fonction pour envoyer un template WhatsApp
  onSendWhatsAppTemplate?: (template: Template) => void;
  // Numéro WhatsApp du contact (nécessaire pour l'affichage de l'option WhatsApp)
  whatsappContactId?: string | null;
}

export default function TemplateMenu({ 
  anchorEl, 
  open,
  onClose, 
  templates,
  onSelectTemplate,
  onSendWhatsAppTemplate,
  whatsappContactId
}: TemplateMenuProps) {
  
  // Déterminer si l'option WhatsApp doit être affichée
  const canSendWhatsAppTemplate = Boolean(onSendWhatsAppTemplate && whatsappContactId);
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{
        elevation: 3,
        sx: {
          minWidth: 280,
          maxWidth: 320,
          borderRadius: 2,
          mt: 1
        }
      }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WhatsAppIcon color="primary" />
          Templates WhatsApp
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sélectionnez un template à envoyer
        </Typography>
      </Box>
      <Divider />
      {templates.length === 0 ? (
        <MenuItem disabled>
          <ListItemText primary="Aucun template disponible" />
        </MenuItem>
      ) : (
        templates.map((template) => (
          <MenuItem 
            key={template.id}
            sx={{ 
              py: 1.5,
              display: 'block',
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.08)'
              }
            }}
          >
            <ListItemText 
              primary={
                <Typography variant="body1" fontWeight={500}>
                  {template.name}
                </Typography>
              }
              secondary={
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {template.description || template.content.substring(0, 60) + (template.content.length > 60 ? '...' : '')}
                </Typography>
              }
            />
            
            <Stack direction="row" spacing={1} mt={1} justifyContent="flex-end">
              <Tooltip title="Copier dans le chat">
                <Button 
                  size="small" 
                  startIcon={<ContentCopyIcon />}
                  variant="text"
                  onClick={() => {
                    onSelectTemplate(template);
                    onClose();
                  }}
                >
                  Copier
                </Button>
              </Tooltip>
              
              {canSendWhatsAppTemplate && (
                <Tooltip title="Envoyer comme template WhatsApp">
                  <Button 
                    size="small" 
                    color="primary"
                    variant="contained"
                    startIcon={<WhatsAppIcon />}
                    onClick={() => {
                      if (onSendWhatsAppTemplate) {
                        onSendWhatsAppTemplate(template);
                        onClose();
                      }
                    }}
                  >
                    Envoyer
                  </Button>
                </Tooltip>
              )}
            </Stack>
          </MenuItem>
        ))
      )}
    </Menu>
  );
}
