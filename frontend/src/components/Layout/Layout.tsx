import React, { ReactNode } from 'react';
import { Box, Container, CssBaseline } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Composant Layout simplifié
 * Fournit une structure de base pour les pages de l'application
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  // Vérifier si l'utilisateur est connecté
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
    };

    checkAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <Container component="main" sx={{ flexGrow: 1, py: 2 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
