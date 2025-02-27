import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SetPassword from './pages/SetPassword';
import Chat from './pages/Chat';
import Login from './pages/Login';
import ChatSandbox from './pages/ChatSandbox';
import Properties from './pages/Properties';
import Layout from './components/Layout/Layout';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session initiale:', session);
      setSession(session);
      setLoading(false);
    });

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Changement de session:', session);
      setSession(session);
      setLoading(false);
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
                  <Route path="/settings" element={<div>Paramètres (à venir)</div>} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
