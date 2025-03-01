import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Container,
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Link as MuiLink
} from '@mui/material';

export default function VerificationSuccess() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier si l'utilisateur est authentifié
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Session active détectée:', session);
          setUserEmail(session.user.email);
          
          // Vérifier si l'utilisateur existe dans la base de données
          const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (userError && userError.code !== 'PGRST116') {
            console.error('Erreur lors de la vérification du profil:', userError);
            setError('Erreur lors de la vérification de votre profil.');
          } else if (!user) {
            console.log('Profil utilisateur non trouvé, création en cours...');
            
            // Créer un profil utilisateur si nécessaire
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([
                { 
                  id: session.user.id,
                  email: session.user.email,
                  created_at: new Date().toISOString()
                }
              ]);
              
            if (insertError) {
              console.error('Erreur lors de la création du profil:', insertError);
              setError('Erreur lors de la création de votre profil.');
            }
          } else {
            console.log('Profil utilisateur trouvé:', user);
          }
        } else {
          console.log('Aucune session active');
          setError('Votre session a expiré ou vous n\'êtes pas connecté.');
        }
      } catch (err) {
        console.error('Erreur lors de la vérification de la session:', err);
        setError('Une erreur est survenue lors de la vérification de votre compte.');
      } finally {
        setLoading(false);
      }
    };

    // Exécuter la vérification
    checkSession();

    // Rediriger vers /chat après 5 secondes si tout est ok
    const redirectTimer = setTimeout(() => {
      if (!error) {
        navigate('/chat');
      }
    }, 5000);

    return () => clearTimeout(redirectTimer);
  }, [navigate, error]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3
        }}
      >
        <Paper
          sx={{
            p: 4,
            width: '100%'
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Vérification réussie
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Votre adresse email {userEmail} a été vérifiée avec succès !
              </Alert>
              
              <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
                Vous allez être redirigé vers l'application dans quelques secondes...
              </Typography>
            </>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              component={Link}
              to="/chat"
              sx={{ minWidth: 200 }}
            >
              Accéder à l'application
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
