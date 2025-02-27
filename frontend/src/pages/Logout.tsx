import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const Logout: React.FC = () => {
  useEffect(() => {
    const logoutUser = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Erreur lors de la déconnexion:', error);
          toast.error('Erreur lors de la déconnexion');
        } else {
          toast.success('Vous avez été déconnecté avec succès');
        }
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Une erreur est survenue');
      }
    };

    logoutUser();
  }, []);

  // Redirection vers la page de login
  return <Navigate to="/login" replace />;
};

export default Logout;
