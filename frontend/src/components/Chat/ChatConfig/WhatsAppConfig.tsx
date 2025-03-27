import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { WhatsAppService, WhatsAppConfig as WhatsAppConfigType } from '../../../services/chat/whatsapp.service';
import { supabase } from '../../../lib/supabase';

interface WhatsAppConfigProps {
  open: boolean;
  onClose: () => void;
}

export default function WhatsAppConfig({ open, onClose }: WhatsAppConfigProps) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      console.log('Tentative de récupération de la configuration WhatsApp via RPC directe...');
      
      // Utiliser directement la fonction RPC sans passer par le service
      const { data, error } = await supabase.rpc('get_whatsapp_config');
      
      if (error) {
        console.error('Erreur lors de l\'appel RPC:', error);
        throw error;
      }
      
      console.log('Configuration WhatsApp récupérée via RPC directe:', data);
      
      if (data) {
        const config = data as WhatsAppConfigType;
        setPhoneNumberId(config.phone_number_id || '');
        setWhatsappToken(config.token || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration WhatsApp:', error);
      setErrorMessage('Erreur lors du chargement de la configuration WhatsApp');
    } finally {
      setIsLoading(false);
    }
  };

  const validateFields = () => {
    if (!phoneNumberId.trim()) {
      setErrorMessage('Le Phone Number ID est requis');
      return false;
    }
    if (!whatsappToken.trim()) {
      setErrorMessage('Le Token WhatsApp est requis');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateFields()) return;
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      console.log('Tentative de sauvegarde de la configuration WhatsApp via Supabase directe...');
      
      // Préparer les données avec updated_at
      const dataToSave = {
        phone_number_id: phoneNumberId,
        token: whatsappToken,
        updated_at: new Date().toISOString()
      };
      
      // Utiliser directement l'API Supabase sans passer par le service
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert(dataToSave);
      
      if (error) {
        console.error('Erreur lors de la sauvegarde via Supabase:', error);
        throw error;
      }
      
      console.log('Configuration WhatsApp sauvegardée avec succès via Supabase directe');
      setSuccessMessage('Configuration WhatsApp enregistrée avec succès');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
      setErrorMessage('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Configuration WhatsApp</DialogTitle>
        <DialogContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Phone Number ID"
                variant="outlined"
                fullWidth
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="Entrez votre Phone Number ID WhatsApp"
                required
                error={errorMessage.includes('Phone Number ID')}
                helperText="ID de votre numéro de téléphone WhatsApp Business"
              />
              <TextField
                label="Token WhatsApp"
                variant="outlined"
                fullWidth
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                type="password"
                placeholder="Entrez votre token WhatsApp"
                required
                error={errorMessage.includes('Token WhatsApp')}
                helperText="Token d'accès à l'API WhatsApp Business"
              />
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  Ces informations sont nécessaires pour envoyer des messages via WhatsApp Business API.
                  Vous pouvez les trouver dans le Meta Business Manager.
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSaving}>Annuler</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            color="primary"
            disabled={isLoading || isSaving}
          >
            {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      
      <Snackbar open={!!errorMessage} autoHideDuration={4000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
