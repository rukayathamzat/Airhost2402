import { 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Divider 
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Template } from '../../../services/chat/template.service';

interface TemplateMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  templates: Template[];
  onSelectTemplate: (template: Template) => void;
}

export default function TemplateMenu({ 
  anchorEl, 
  onClose, 
  templates,
  onSelectTemplate 
}: TemplateMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
    >
      <MenuItem disabled sx={{ opacity: 1 }}>
        <ListItemIcon>
          <WhatsAppIcon />
        </ListItemIcon>
        <ListItemText 
          primary="Templates WhatsApp"
          secondary="Sélectionnez un template à envoyer"
        />
      </MenuItem>
      <Divider />
      {templates.map((template) => (
        <MenuItem 
          key={template.id}
          onClick={() => {
            onSelectTemplate(template);
            onClose();
          }}
        >
          <ListItemText 
            primary={template.name}
            secondary={template.description}
          />
        </MenuItem>
      ))}
    </Menu>
  );
}
