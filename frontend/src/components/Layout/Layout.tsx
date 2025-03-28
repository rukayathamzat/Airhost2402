import { ReactNode, useState } from 'react';
import { useMediaQuery, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, Box, Button, TextField, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MobileBottomMenu from './MobileBottomMenu';
import SideMenu from '../SideMenu/SideMenu';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  // États pour le menu et la configuration WhatsApp
  const [menuOpen, setMenuOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [saving, setSaving] = useState(false);

  // Gestion de la configuration WhatsApp
  const openWhatsAppConfig = async () => {
    console.log('Ouverture de la configuration WhatsApp via Edge Function (invoke)');
    
    try {
      // Utiliser supabase.functions.invoke au lieu de fetch pour gérer automatiquement l'authentification
      console.log('Appel de l\'Edge Function avec supabase.functions.invoke');
      const { data, error } = await supabase.functions.invoke('whatsapp-config', {
        method: 'GET'
      });
      
      console.log('Réponse de l\'Edge Function:', data, error);
      
      if (error) {
        console.error("Erreur lors de l'appel à l'Edge Function:", error);
        return;
      }
      
      console.log("Configuration WhatsApp récupérée via Edge Function avec succès:", data);

      if (data) {
        setPhoneNumberId(data.phone_number_id || '');
        setWhatsappToken(data.token || '');
      }
      
      setConfigOpen(true);
      setMenuOpen(false); // Fermer le menu si ouvert
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    
    try {
      // Préparer les données de configuration
      const configData = {
        phone_number_id: phoneNumberId,
        token: whatsappToken
      };
      
      console.log("Sauvegarde de la configuration WhatsApp via Edge Function (invoke):", configData);
      
      // Utiliser supabase.functions.invoke au lieu de fetch pour gérer automatiquement l'authentification
      const { data: result, error } = await supabase.functions.invoke('whatsapp-config', {
        method: 'POST',
        body: configData
      });
      
      console.log('Réponse de l\'Edge Function (sauvegarde):', result, error);
      
      if (error) {
        console.error("Erreur lors de l'appel à l'Edge Function:", error);
        throw new Error(error.message || 'Erreur lors de la sauvegarde');
      }
      
      console.log("Configuration WhatsApp sauvegardée via Edge Function avec succès:", result);

      console.log('Configuration WhatsApp enregistrée avec succès');
      setConfigOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleMenuOpen = () => {
    setMenuOpen(true);
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <div className="layout">
      {!isMobile && <SideMenu />}
      <main className="main-content">
        {children}
      </main>

      {isMobile && (
        <>
          {/* Menu du bas pour mobile */}
          <MobileBottomMenu onMenuClick={handleMenuOpen} />
          
          {/* Menu contextuel */}
          <Dialog
            open={menuOpen}
            onClose={handleMenuClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
              sx: {
                position: 'fixed',
                bottom: 0,
                m: 0,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                height: 'auto',
                maxHeight: '70vh',
                width: '100%'
              }
            }}
          >
            <DialogTitle>
              Menu
              <IconButton
                aria-label="close"
                onClick={handleMenuClose}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              <List>
                <ListItem disablePadding>
                  <ListItemButton onClick={openWhatsAppConfig}>
                    <ListItemIcon>
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Paramètres" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton>
                    <ListItemIcon>
                      <HelpOutlineIcon />
                    </ListItemIcon>
                    <ListItemText primary="Aide" />
                  </ListItemButton>
                </ListItem>
                <Divider />
                <ListItem disablePadding>
                  <ListItemButton onClick={handleSignOut}>
                    <ListItemIcon>
                      <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText primary="Déconnexion" />
                  </ListItemButton>
                </ListItem>
              </List>
            </DialogContent>
          </Dialog>

          {/* Dialogue de configuration WhatsApp */}
          <Dialog open={configOpen} onClose={() => setConfigOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>
              Configuration WhatsApp
              <IconButton
                aria-label="close"
                onClick={() => setConfigOpen(false)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WhatsAppIcon sx={{ color: '#25D366', mr: 1 }} />
                <Typography variant="body1">Configurez les identifiants pour votre webhook WhatsApp</Typography>
              </Box>
              <TextField
                fullWidth
                label="Phone Number ID"
                margin="normal"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                helperText="ID de votre numéro de téléphone WhatsApp Business"
              />
              <TextField
                fullWidth
                label="Token d'accès"
                margin="normal"
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                helperText="Token d'accès à l'API WhatsApp Business"
                type="password"
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setConfigOpen(false)}>Annuler</Button>
              <Button
                onClick={handleSaveConfig}
                variant="contained"
                disabled={saving || !phoneNumberId || !whatsappToken}
                startIcon={saving ? <CircularProgress size={20} /> : null}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default Layout;
