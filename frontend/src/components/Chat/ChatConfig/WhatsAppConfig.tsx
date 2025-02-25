import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material';
import { WhatsAppService, WhatsAppConfig as Config } from '../../../services/chat/whatsapp.service';

interface WhatsAppConfigProps {
  open: boolean;
  onClose: () => void;
}

export default function WhatsAppConfig({ open, onClose }: WhatsAppConfigProps) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    try {
      const config = await WhatsAppService.getConfig();
      if (config) {
        setPhoneNumberId(config.phone_number_id || '');
        setWhatsappToken(config.token || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration WhatsApp:', error);
    }
  };

  const handleSave = async () => {
    try {
      await WhatsAppService.saveConfig({
        phone_number_id: phoneNumberId,
        token: whatsappToken
      });
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configuration WhatsApp</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Phone Number ID"
            variant="outlined"
            fullWidth
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="Entrez votre Phone Number ID WhatsApp"
          />
          <TextField
            label="Token WhatsApp"
            variant="outlined"
            fullWidth
            value={whatsappToken}
            onChange={(e) => setWhatsappToken(e.target.value)}
            type="password"
            placeholder="Entrez votre token WhatsApp"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
