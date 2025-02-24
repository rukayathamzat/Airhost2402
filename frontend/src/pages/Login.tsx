import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress
} from '@mui/material';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      console.log('Tentative de connexion avec:', { email, password });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('Connexion réussie:', data);
      setSuccess(true);
      navigate('/');
    } catch (err: any) {
      console.error('Erreur de connexion:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Veuillez entrer votre email');
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      console.log('Envoi du magic link à:', email);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'http://localhost:5174'
        }
      });

      if (error) throw error;

      setSuccess(true);
      setError('Un lien de connexion a été envoyé à votre email');
    } catch (err: any) {
      console.error('Erreur magic link:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Veuillez entrer votre email');
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      setSuccess(true);
      setError('Les instructions de réinitialisation du mot de passe ont été envoyées à votre email');
    } catch (err: any) {
      console.error('Erreur réinitialisation:', err);
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
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
