import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SetPassword from './pages/SetPassword';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Register from './pages/Register';
import VerificationError from './pages/VerificationError';
import VerificationSuccess from './pages/VerificationSuccess';
import ChatSandbox from './pages/ChatSandbox';
import Properties from './pages/Properties';
import Settings from './pages/Settings';
import Debug from './pages/Debug';
import Layout from './components/Layout/Layout';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import NotificationTestButton from './components/NotificationTestButton';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'URL contient un code d'authentification
    const handleAuthRedirect = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      
      if (code) {
        console.log('Code d\'authentification détecté:', code);
        try {
          // Attendre que Supabase traite le code
          await supabase.auth.getSession();
          
          // Si l'URL contient déjà 'verification-success', ne pas rediriger à nouveau
          if (window.location.pathname.includes('verification-success')) {
            console.log('Déjà sur la page de confirmation, pas de redirection nécessaire');
            // Juste nettoyer les paramètres d'URL
            // window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            // Rediriger vers la page de succès de vérification si c'est une vérification d'email
            const type = url.searchParams.get('type');
            if (type === 'signup' || type === 'recovery') {
              console.log('Redirection vers la page de confirmation');
              window.location.href = '/verification-success';
            } else {
              // Nettoyer l'URL pour les autres types d'authentification
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } catch (error) {
          console.error('Erreur lors du traitement du code d\'authentification:', error);
        }
      }
    };
    
    // Exécuter la vérification du code d'authentification
    handleAuthRedirect();
    
    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session initiale:', session);
      setSession(session);
      setLoading(false);
    });

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Changement de session:', _event, session);
      setSession(session);
      setLoading(false);
      
      // Nettoyer l'URL après une authentification réussie
      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
        const currentUrl = window.location.href;
        if (currentUrl.includes('#access_token=') || currentUrl.includes('?code=')) {
          // Ne pas nettoyer l'URL si on est en train de traiter une vérification d'email
          // La logique de redirection est gérée dans handleAuthRedirect
          if (!currentUrl.includes('type=signup') && !currentUrl.includes('type=recovery')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
      <Routes>
        <Route path="/set-password" element={<SetPassword />} />
        <Route 
          path="/login" 
          element={
            session ? (
              <Navigate to="/chat" replace />
            ) : (
              <Login />
            )
          } 
        />
        <Route 
          path="/register" 
          element={
            session ? (
              <Navigate to="/chat" replace />
            ) : (
              <Register />
            )
          } 
        />
        <Route 
          path="/verification-error" 
          element={
            session ? (
              <Navigate to="/chat" replace />
            ) : (
              <VerificationError />
            )
          } 
        />
        <Route 
          path="/verification-success" 
          element={<VerificationSuccess />} 
        />
        <Route 
          path="/debug" 
          element={<Debug />} 
        />
        <Route
          path="/"
          element={
            session ? (
              <Navigate to="/chat" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/*"
          element={
            session ? (
              <Layout>
                <Routes>
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/emergency" element={<div>Cas d&apos;urgence (à venir)</div>} />
                  <Route path="/sandbox" element={<ChatSandbox />} />
                  <Route path="/properties" element={<Properties />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/debug" element={<Debug />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      {session && <NotificationTestButton />}
    </Router>
  );
}

export default App;
