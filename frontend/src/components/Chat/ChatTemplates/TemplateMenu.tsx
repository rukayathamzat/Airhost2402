import { 
  Menu, 
  MenuItem, 
  ListItemText,
  Divider,
  Typography,
  Box
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Template } from '../../../services/chat/template.service';

interface TemplateMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  templates: Template[];
  onSelectTemplate: (template: Template) => void;
}

export default function TemplateMenu({ 
  anchorEl, 
  open,
  onClose, 
  templates,
  onSelectTemplate 
}: TemplateMenuProps) {
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
            onClick={() => {
              onSelectTemplate(template);
              onClose();
            }}
            sx={{ 
              py: 1.5,
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
          </MenuItem>
        ))
      )}
    </Menu>
  );
}
