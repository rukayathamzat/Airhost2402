import React, { useEffect, useState } from 'react';
import { Box, Button, Switch, Typography } from '@mui/material';
import { NotificationService } from '../../services/notification/notification.service';

/**
 * Composant pour activer/désactiver les notifications
 */
const NotificationToggle: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Vérifier l'état des notifications au chargement
  useEffect(() => {
    const checkNotificationStatus = async () => {
      try {
        const enabled = await NotificationService.areNotificationsEnabled();
        setNotificationsEnabled(enabled);
      } catch (error) {
        console.error('Erreur lors de la vérification des notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    checkNotificationStatus();
  }, []);

  // Gérer le changement d'état des notifications
  const handleToggleNotifications = async () => {
    setLoading(true);
    
    try {
      if (notificationsEnabled) {
        // Désactiver les notifications
        const success = await NotificationService.unsubscribe();
        if (success) {
          setNotificationsEnabled(false);
        }
      } else {
        // Activer les notifications
        const success = await NotificationService.requestPermission();
        if (success) {
          setNotificationsEnabled(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors du changement d\'état des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Notifications
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Switch
          checked={notificationsEnabled}
          onChange={handleToggleNotifications}
          disabled={loading}
        />
        <Typography>
          {notificationsEnabled ? 'Notifications activées' : 'Notifications désactivées'}
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {notificationsEnabled 
          ? 'Vous recevrez des notifications lorsque vous recevrez de nouveaux messages.' 
          : 'Activez les notifications pour être informé des nouveaux messages.'}
      </Typography>
      
      {!notificationsEnabled && (
        <Button 
          variant="outlined" 
          onClick={handleToggleNotifications}
          disabled={loading}
        >
          Activer les notifications
        </Button>
      )}
    </Box>
  );
};

export default NotificationToggle;
