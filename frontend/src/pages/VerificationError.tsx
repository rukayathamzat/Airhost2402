import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
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

export default function VerificationError() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  // Extraire les paramètres d'erreur de l'URL
  useEffect(() => {
    const params = new URLSearchParams(location.hash.replace('#', '?'));
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');
    
    if (errorCode === 'otp_expired') {
      setError('Le lien de vérification a expiré. Veuillez demander un nouveau lien.');
    } else if (errorCode) {
      setError(`Erreur: ${errorDescription || errorCode}`);
    }
  }, [location]);

  const handleResendVerification = async () => {
    if (!email) {
      setError('Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) throw error;

      setMessage('Un nouveau lien de vérification a été envoyé à votre adresse email.');
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi du lien:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            Problème de vérification
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Pour recevoir un nouveau lien de vérification, veuillez entrer votre adresse email :
            </Typography>
            
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleResendVerification();
              }}
              sx={{ mt: 2 }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse email"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '20px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
                required
              />

              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={!email || loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Envoyer un nouveau lien'
                )}
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <MuiLink component={Link} to="/login" variant="body2">
              Retourner à la page de connexion
            </MuiLink>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
