import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaComments, FaExclamationTriangle, FaFlask, FaWhatsapp, FaSignOutAlt } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import './SideMenu.css';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';

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
  const [apiKey, setApiKey] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

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
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors du chargement de la configuration WhatsApp:', error);
        toast.error('Erreur lors du chargement de la configuration');
      }

      if (data) {
        setPhoneNumberId(data.phone_number_id || '');
        setWhatsappToken(data.token || '');
        setApiKey(data.api_key || '');
        setVerificationToken(data.verification_token || '');
        setEnabled(data.enabled || false);
      }

      setConfigOpen(true);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert({
          id: 1, // ID fixe pour une configuration unique
          phone_number_id: phoneNumberId,
          token: whatsappToken,
          api_key: apiKey,
          verification_token: verificationToken,
          enabled: enabled,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erreur lors de la sauvegarde de la configuration:', error);
        toast.error('Erreur lors de la sauvegarde');
        return;
      }

      toast.success('Configuration sauvegardée avec succès');
      setConfigOpen(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const mainMenuItems: MenuItem[] = [
    { path: '/chat', label: 'Conversations', icon: <FaComments /> },
    { path: '/properties', label: 'Propriétés', icon: <FaHome /> },
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
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="sm" fullWidth>
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
            <TextField
              label="Clé API"
              variant="outlined"
              fullWidth
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              placeholder="Entrez votre clé API WhatsApp"
            />
            <TextField
              label="Token de vérification"
              variant="outlined"
              fullWidth
              value={verificationToken}
              onChange={(e) => setVerificationToken(e.target.value)}
              placeholder="Token pour webhook verification"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <label htmlFor="enabled">Activer l'intégration WhatsApp</label>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>Annuler</Button>
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
