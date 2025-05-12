import React, { useState, useEffect } from 'react';
import { Button, Alert, Box, Typography, Paper, CircularProgress, Chip } from '@mui/material';
import { MobileNotificationService } from '../services/mobile-notification.service';
import { requestFCMPermission } from '../lib/firebase';
import { supabase } from '../lib/supabase';

/**
 * Composant de test des notifications FCM
 * Permet de tester l'enregistrement des tokens et l'envoi des notifications
 */
const NotificationTester: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [dbToken, setDbToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Charger les données initiales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Récupérer le token depuis le localStorage
        const storedToken = localStorage.getItem('fcm_token');
        if (storedToken) {
          setToken(storedToken);
        }
        
        // Récupérer l'utilisateur actuel
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          
          // Vérifier si le token est enregistré dans Supabase
          const { data } = await supabase
            .from('push_subscriptions')
            .select('token')
            .eq('user_id', currentUser.id)
            .single();
            
          if (data) {
            setDbToken(data.token);
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données initiales:', err);
      }
    };
    
    loadInitialData();
  }, []);

  // Demander la permission et obtenir un token FCM
  const requestPermission = async () => {
    setLoading(true);
    setError(null);
    setStatus('Demande de permission...');
    
    try {
      const newToken = await requestFCMPermission();
      if (newToken) {
        setToken(newToken);
        setStatus('Permission accordée, token obtenu');
        
        // Enregistrer le token
        await MobileNotificationService.registerToken(newToken);
        setStatus('Token enregistré avec succès');
        
        // Rafraîchir le token dans la base de données
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data } = await supabase
            .from('push_subscriptions')
            .select('token')
            .eq('user_id', currentUser.id)
            .single();
            
          if (data) {
            setDbToken(data.token);
          }
        }
      } else {
        setError('Impossible d\'obtenir un token FCM');
      }
    } catch (err: any) {
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Tester l'envoi d'une notification
  const testNotification = async () => {
    setLoading(true);
    setError(null);
    setStatus('Envoi de la notification de test...');
    
    try {
      // Utiliser le token actuel ou un token de test
      const targetToken = token || 'test-fcm-token';
      
      // Créer le payload de la notification
      const payload = {
        to: targetToken,
        notification: {
          title: 'Test de notification',
          body: `Test envoyé à ${new Date().toLocaleTimeString()}`,
          icon: '/logo192.png'
        },
        data: {
          timestamp: Date.now(),
          testId: Math.random().toString(36).substring(2, 10)
        }
      };
      
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Utilisateur non authentifié');
      }
      
      // Déterminer l'URL de l'Edge Function dynamiquement
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tornfqtvnzkgnwfudxdb.supabase.co';
      const fcmProxyUrl = `${supabaseUrl}/functions/v1/fcm-proxy`;
      
      // Envoyer la requête à l'Edge Function
      const response = await fetch(fcmProxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur ${response.status}: ${errorData.error || 'Erreur inconnue'}`);
      }
      
      const result = await response.json();
      setStatus(`Notification envoyée avec succès: ${result.success ? 'OK' : 'Échec'}`);
    } catch (err: any) {
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, margin: '0 auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Testeur de Notifications FCM
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1">Statut utilisateur:</Typography>
        <Chip 
          label={user ? `Connecté (${user.email})` : 'Non connecté'} 
          color={user ? 'success' : 'error'} 
          sx={{ mr: 1 }}
        />
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1">Statut du token FCM:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip 
            label={token ? 'Token local: Présent' : 'Token local: Absent'} 
            color={token ? 'success' : 'error'} 
          />
          <Chip 
            label={dbToken ? 'Token DB: Présent' : 'Token DB: Absent'} 
            color={dbToken ? 'success' : 'error'} 
          />
          <Chip 
            label={token && dbToken && token === dbToken ? 'Tokens synchronisés' : 'Tokens non synchronisés'} 
            color={token && dbToken && token === dbToken ? 'success' : 'warning'} 
          />
        </Box>
      </Box>
      
      {token && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Token:</Typography>
          <Typography variant="caption" component="div" sx={{ 
            wordBreak: 'break-all', 
            backgroundColor: '#f5f5f5', 
            p: 1, 
            borderRadius: 1 
          }}>
            {token.substring(0, 12) + '...' + token.substring(token.length - 12)}
          </Typography>
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {status && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {status}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          onClick={requestPermission} 
          disabled={loading}
          color="primary"
        >
          {loading ? <CircularProgress size={24} /> : 'Demander les permissions'}
        </Button>
        
        <Button 
          variant="contained" 
          onClick={testNotification} 
          disabled={loading}
          color="secondary"
        >
          {loading ? <CircularProgress size={24} /> : 'Tester notification'}
        </Button>
      </Box>
    </Paper>
  );
};

export default NotificationTester;
