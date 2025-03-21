import { Button, Container, Grid, TextField, Typography, Paper } from '@mui/material';
import { useState, useEffect } from 'react';
import { MobileNotificationService } from '../services/notification/mobile-notification.service';
import { NotificationService } from '../services/notification/notification.service';

const NotificationTest = () => {
  const [fcmToken, setFcmToken] = useState('test-fcm-token');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Capture des logs pour affichage dans l'interface
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    // Redirige les logs vers notre interface
    console.log = function(...args) {
      originalConsoleLog.apply(console, args);
      const logMessage = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      if (logMessage.includes('[NOTIF DEBUG]') || logMessage.includes('FCM')) {
        setLogs(prevLogs => [logMessage, ...prevLogs.slice(0, 19)]);
      }
    };
    
    console.error = function(...args) {
      originalConsoleError.apply(console, args);
      const logMessage = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      if (logMessage.includes('[NOTIF DEBUG]') || logMessage.includes('FCM')) {
        setLogs(prevLogs => [`ERROR: ${logMessage}`, ...prevLogs.slice(0, 19)]);
      }
    };
    
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);

  const initServices = async () => {
    try {
      setStatus('Initialisation des services de notification...');
      await NotificationService.init();
      setStatus('Services initialisés avec succès');
    } catch (err: any) {
      console.error('Erreur d\'initialisation:', err);
      setError(`Erreur d'initialisation: ${err?.message || 'Erreur inconnue'}`);
    }
  };

  const registerToken = async () => {
    try {
      setStatus('Enregistrement du token FCM...');
      await MobileNotificationService.registerToken(fcmToken);
      setStatus('Token enregistré avec succès');
    } catch (err: any) {
      console.error('Erreur d\'enregistrement:', err);
      setError(`Erreur d'enregistrement: ${err?.message || 'Erreur inconnue'}`);
    }
  };

  const testEdgeFunction = async () => {
    try {
      setStatus('Test d\'appel à la fonction Netlify...');
      
      // Utilisation de la fonction Netlify au lieu de l'Edge Function Supabase
      const response = await fetch('/.netlify/functions/fcm-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: fcmToken,
          notification: {
            title: 'Test direct',
            body: 'Message de test direct pour FCM'
          },
          data: {
            type: 'test'
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'appel à la fonction Netlify');
      }
      
      const data = await response.json();
      setStatus(`Fonction Netlify appelée avec succès. Réponse: ${JSON.stringify(data)}`);
    } catch (err: any) {
      console.error('Erreur d\'appel à la fonction:', err);
      setError(`Erreur d'appel à la fonction: ${err?.message || 'Erreur inconnue'}`);
    }
  };

  const testNotification = async () => {
    try {
      setStatus('Envoi d\'une notification de message...');
      const testMessage = {
        id: 'test-id-' + Date.now(),
        content: 'Ceci est un message de test',
        conversation_id: 'test-conversation',
        direction: 'inbound' as 'inbound', // Type assertion pour garantir le type 'inbound' | 'outbound'
        created_at: new Date().toISOString()
      };

      await NotificationService.notifyNewMessage(testMessage);
      setStatus('Notification envoyée avec succès');
    } catch (err: any) {
      console.error('Erreur d\'envoi de notification:', err);
      setError(`Erreur d'envoi de notification: ${err?.message || 'Erreur inconnue'}`);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Test du système de notifications
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Token FCM"
            value={fcmToken}
            onChange={(e) => setFcmToken(e.target.value)}
            margin="normal"
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Button 
            fullWidth 
            variant="contained" 
            color="primary" 
            onClick={initServices}
          >
            1. Initialiser les services
          </Button>
        </Grid>

        <Grid item xs={12} md={6}>
          <Button 
            fullWidth 
            variant="contained" 
            color="primary" 
            onClick={registerToken}
          >
            2. Enregistrer le token
          </Button>
        </Grid>

        <Grid item xs={12} md={6}>
          <Button 
            fullWidth 
            variant="contained" 
            color="primary" 
            onClick={testEdgeFunction}
          >
            3. Tester Fonction Netlify
          </Button>
        </Grid>

        <Grid item xs={12} md={6}>
          <Button 
            fullWidth 
            variant="contained" 
            color="primary" 
            onClick={testNotification}
          >
            4. Tester Notification
          </Button>
        </Grid>

        <Grid item xs={12} md={6}>
          <Button 
            fullWidth 
            variant="contained" 
            color="secondary" 
            onClick={() => {
              const token = localStorage.getItem('fcm_token');
              setStatus(`Token FCM dans localStorage: ${token || 'Non trouvé'}`);
              console.log('FCM Token dans localStorage:', token);
            }}
          >
            Vérifier Token FCM stocké
          </Button>
        </Grid>

        {status && (
          <Grid item xs={12}>
            <Typography variant="subtitle1" color="primary">
              Statut: {status}
            </Typography>
          </Grid>
        )}

        {error && (
          <Grid item xs={12}>
            <Typography variant="subtitle1" color="error">
              Erreur: {error}
            </Typography>
          </Grid>
        )}
        
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Logs de Notification (20 derniers)
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              maxHeight: '300px', 
              overflow: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
          >
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  {log}
                </div>
              ))
            ) : (
              <Typography color="text.secondary">
                Aucun log de notification pour le moment...
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default NotificationTest;
