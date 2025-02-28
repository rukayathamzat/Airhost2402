import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getRedirectUrl } from '../utils/url';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Link as MuiLink
} from '@mui/material';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Vérifier les paramètres d'URL pour les messages de vérification
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verified = params.get('verified');
    
    if (verified === 'true') {
      setSuccess(true);
      setError('Votre email a été vérifié avec succès. Vous pouvez maintenant vous connecter.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      console.log('Tentative de connexion avec:', { email, password });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('Connexion réussie:', data);
      navigate('/chat');
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      setError(error.message || 'Une erreur est survenue lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Envoi du magic link à:', email);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getRedirectUrl('chat'),
        },
      });

      if (error) throw error;

      setSuccess(true);
      setError('Un lien de connexion a été envoyé à votre adresse email.');
    } catch (error: any) {
      console.error('Erreur d\'envoi du lien magique:', error);
      setError(error.message || 'Une erreur est survenue lors de l\'envoi du lien de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectUrl('set-password'),
      });

      if (error) throw error;

      setSuccess(true);
      setError('Un lien de réinitialisation a été envoyé à votre adresse email.');
    } catch (error: any) {
      console.error('Erreur de réinitialisation du mot de passe:', error);
      setError(error.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe');
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
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: 4,
            width: '100%'
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Connexion
          </Typography>

          {error && (
            <Alert 
              severity={success ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            disabled={loading}
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexDirection: 'column' }}>
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={!email || !password || loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Se connecter'
              )}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleMagicLink}
              disabled={!email || loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Recevoir un lien magique'
              )}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={handleResetPassword}
              disabled={!email || loading}
            >
              Réinitialiser le mot de passe
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <MuiLink component={Link} to="/register" variant="body2">
                Pas encore de compte ? S'inscrire
              </MuiLink>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
