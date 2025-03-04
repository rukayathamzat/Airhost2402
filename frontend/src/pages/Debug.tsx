import { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Divider } from '@mui/material';
import { DebugService } from '../services/debug.service';
import { TestService } from '../services/test.service';

const Debug = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const checkEnvironment = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await DebugService.checkEnvironment();
      setDebugInfo(data);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };
  
  const testAIResponse = async () => {
    setTestLoading(true);
    setTestError(null);
    try {
      const data = await TestService.testAIResponse();
      setTestResult(data);
    } catch (err: any) {
      setTestError(err.message || 'Une erreur est survenue lors du test AI');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Débogage de l'environnement Netlify
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={checkEnvironment} 
        disabled={loading}
        sx={{ mb: 3 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Vérifier l\'environnement'}
      </Button>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {debugInfo && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Informations de débogage
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Environnement: {debugInfo.environment}
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Variables d'environnement:
          </Typography>
          <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, overflow: 'auto' }}>
            {JSON.stringify(debugInfo.envVars, null, 2)}
          </pre>
          
          <Typography variant="subtitle1" gutterBottom>
            Informations sur la requête:
          </Typography>
          <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, overflow: 'auto' }}>
            {JSON.stringify(debugInfo.requestInfo, null, 2)}
          </pre>
          
          <Typography variant="subtitle1" gutterBottom>
            Environnement d'exécution:
          </Typography>
          <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, overflow: 'auto' }}>
            {JSON.stringify(debugInfo.functionRuntime, null, 2)}
          </pre>
        </Paper>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h4" gutterBottom>
        Test de la fonction AI
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={testAIResponse} 
        disabled={testLoading}
        sx={{ mb: 3 }}
        color="secondary"
      >
        {testLoading ? <CircularProgress size={24} /> : 'Tester la fonction AI'}
      </Button>
      
      {testError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {testError}
        </Alert>
      )}
      
      {testResult && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Résultat du test AI
          </Typography>
          
          <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, overflow: 'auto' }}>
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </Paper>
      )}
    </Box>
  );
};

export default Debug;
