import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';
import TestConversationCreation from '../components/TestConversationCreation';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const TestConversation: React.FC = () => {
  const { session } = useAuth();

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!session) {
    return <Navigate to="/login" />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Test de l'Edge Function create-conversation
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Cette page vous permet de tester la création de conversations via l'Edge Function Supabase.
          </Typography>
        </Box>
        
        <TestConversationCreation />
      </Paper>
    </Container>
  );
};

export default TestConversation;
