import React from 'react';
import { Button } from '@mui/material';
import { testFirebaseNotification } from '../lib/firebase';

const NotificationTestButton: React.FC = () => {
  const handleTest = async () => {
    try {
      console.log('Démarrage du test de notification...');
      const result = await testFirebaseNotification();
      console.log('Résultat du test:', result);
    } catch (error) {
      console.error('Erreur lors du test:', error);
    }
  };

  return (
    <Button 
      variant="contained" 
      color="primary" 
      onClick={handleTest}
      sx={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}
    >
      Tester Notification
    </Button>
  );
};

export default NotificationTestButton;
