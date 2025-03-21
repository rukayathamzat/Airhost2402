import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Récupérer le token de l'URL
    const hash = window.location.hash;
    if (!hash) {
      setError('Lien de réinitialisation invalide');
      return;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 2
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: 400,
          width: '100%',
          p: 3,
          border: '1px solid #ddd',
          borderRadius: 1,
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom>
          Réinitialisation du mot de passe
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Mot de passe mis à jour avec succès !
          </Alert>
        )}

        <TextField
          fullWidth
          type="password"
          label="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          variant="contained"
          type="submit"
          disabled={!password || success}
        >
          Mettre à jour le mot de passe
        </Button>
      </Box>
    </Box>
  );
}
