import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { testFirebaseNotification, testMobileNotification } from '../lib/firebase';

const NotificationTestButton: React.FC = () => {
  const handleTest = async () => {
    try {
      console.log('Démarrage du test de notification standard...');
      const result = await testFirebaseNotification();
      console.log('Résultat du test standard:', result);
    } catch (error) {
      console.error('Erreur lors du test standard:', error);
    }
  };

  const handleMobileTest = async () => {
    try {
      console.log('Démarrage du test de notification format mobile...');
      const result = await testMobileNotification();
      console.log('Résultat du test mobile:', result);
    } catch (error) {
      console.error('Erreur lors du test mobile:', error);
    }
  };

  return (
    <Stack 
      direction="column" 
      spacing={1}
      sx={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}
    >
      <Typography variant="caption" sx={{ bgcolor: 'background.paper', p: 0.5, borderRadius: 1 }}>
        Tests de notification
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleTest}
        size="small"
      >
        Test Standard
      </Button>
      <Button 
        variant="contained" 
        color="secondary" 
        onClick={handleMobileTest}
        size="small"
      >
        Test Format Mobile
      </Button>
    </Stack>
  );
};

export default NotificationTestButton;
