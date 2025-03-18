import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

/**
 * Hook personnalisé pour gérer l'utilisateur authentifié
 * Fournit l'utilisateur actuel et des fonctions utilitaires liées à l'authentification
 */
export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer l'utilisateur actuel
    const getUser = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    // Appeler getUser au chargement du composant
    getUser();

    // Configurer l'écouteur d'événements pour les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Nettoyer l'écouteur lors du démontage du composant
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fonction de déconnexion
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user
  };
};
