import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaComments, FaExclamationTriangle, FaFlask, FaWhatsapp, FaSignOutAlt } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import './SideMenu.css';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Avatar, Typography } from '@mui/material';
import { useUser } from '../../lib/auth';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactElement;
  onClick?: () => void;
}

const SideMenu: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [saving, setSaving] = useState(false);

  // Récupérer l'utilisateur connecté
  const user = useUser();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
        toast.error('Erreur lors de la déconnexion');
      } else {
        toast.success('Vous avez été déconnecté avec succès');
        navigate('/login');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    }
  };

  const openWhatsAppConfig = async () => {
    console.log('Ouverture de la configuration WhatsApp via Edge Function (invoke)');
    toast.info('Chargement de la configuration WhatsApp...');
    
    try {
      // Utiliser supabase.functions.invoke au lieu de fetch pour gérer automatiquement l'authentification
      console.log('Appel de l\'Edge Function avec supabase.functions.invoke');
      const { data, error } = await supabase.functions.invoke('whatsapp-config', {
        method: 'GET'
      });
      
      console.log('Réponse de l\'Edge Function:', data, error);
      
      if (error) {
        console.error("Erreur lors de l'appel à l'Edge Function:", error);
        toast.error('Erreur lors du chargement de la configuration');
        return;
      }
      
      console.log("Configuration WhatsApp récupérée via Edge Function avec succès:", data);

      if (data) {
        setPhoneNumberId(data.phone_number_id || '');
        setWhatsappToken(data.token || '');
      } else {
        console.log('Aucune configuration WhatsApp trouvée, utilisation des valeurs par défaut');
      }

      // Force l'ouverture de la popup
      setConfigOpen(true);
      console.log('État configOpen:', true);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      
      // Préparer les données de configuration
      const configData = {
        phone_number_id: phoneNumberId,
        token: whatsappToken,
        updated_at: new Date().toISOString()
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
        toast.error('Erreur lors de la sauvegarde');
        setSaving(false);
        return;
      }
      
      console.log("Configuration WhatsApp sauvegardée via Edge Function avec succès:", result);
      toast.success('Configuration sauvegardée avec succès');
      setConfigOpen(false);
      setSaving(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
      setSaving(false);
    }
  };

  const mainMenuItems: MenuItem[] = [
    { path: '/chat', label: 'Conversations', icon: <FaComments /> },
    { path: '/properties', label: 'Appartements', icon: <FaHome /> },
    { path: '/emergency', label: 'Cas d\'urgence', icon: <FaExclamationTriangle /> },
    { path: '/sandbox', label: 'Chat Sandbox', icon: <FaFlask /> },
  ];

  const bottomMenuItems: MenuItem[] = [
    { 
      path: '#', 
      label: 'Configuration WhatsApp', 
      icon: <FaWhatsapp />,
      onClick: openWhatsAppConfig
    },
    { 
      path: '#', 
      label: 'SE DÉCONNECTER', 
      icon: <FaSignOutAlt />,
      onClick: handleLogout
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <Link
      key={item.path}
      to={item.onClick ? '#' : item.path}
      className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
      onClick={item.onClick}
    >
      <span className="menu-icon">{item.icon}</span>
      <span className="menu-label">{item.label}</span>
    </Link>
  );

  return (
    <>
      <div className="side-menu">
        <div className="user-info">
          <Avatar className="avatar">{user?.user_metadata?.name?.[0]}</Avatar>
          <div>
            <Typography variant="subtitle1">{user?.user_metadata?.name}</Typography>
            <Typography variant="caption" color="textSecondary">
              {user?.email}
            </Typography>
          </div>
        </div>
        <div className="menu-header">
          <h2 className="app-title">AirHost Admin</h2>
        </div>
        <nav className="menu-nav">
          {mainMenuItems.map(renderMenuItem)}
        </nav>
        <nav className="menu-nav bottom-nav">
          {bottomMenuItems.map(renderMenuItem)}
        </nav>
      </div>

      {/* Dialog de configuration WhatsApp */}
      <Dialog 
        open={configOpen} 
        onClose={() => {
          console.log('Fermeture du dialog');
          setConfigOpen(false);
        }} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1400 }}
      >
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
          <Button 
            onClick={() => {
              console.log('Annulation de la configuration');
              setConfigOpen(false);
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSaveConfig} 
            variant="contained" 
            color="primary"
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SideMenu;
