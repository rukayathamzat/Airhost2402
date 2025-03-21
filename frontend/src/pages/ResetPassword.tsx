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

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Rediriger vers la page de connexion
      navigate('/login', { 
        state: { 
          message: 'Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.' 
        }
      });
    } catch (err: any) {
      console.error('Erreur mise à jour mot de passe:', err);
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
            Nouveau mot de passe
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Nouveau mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <Box sx={{ mt: 3 }}>
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={!password || !confirmPassword || loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Mettre à jour le mot de passe'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
