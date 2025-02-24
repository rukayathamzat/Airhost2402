import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SetPassword from './pages/SetPassword';
import Chat from './pages/Chat';
import Login from './pages/Login';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
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
      <Routes>
        <Route path="/set-password" element={<SetPassword />} />
        <Route 
          path="/login" 
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <Login />
            )
          } 
        />
        <Route 
          path="/chat"
          element={
            session ? (
              <Chat />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/" 
          element={
            session ? (
              <Chat />
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
