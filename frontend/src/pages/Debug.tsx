import React, { useState } from 'react';
import { Box, Button, Container, Grid, Paper, TextField, Typography, CircularProgress, Divider, Tabs, Tab } from '@mui/material';
import NotificationTest from '../components/NotificationTest';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const DebugPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [apartmentId, setApartmentId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [testType, setTestType] = useState('env');
  const [tabValue, setTabValue] = useState(0);

  const runTest = async (type: string) => {
    setLoading(true);
    setResult(null);
    setTestType(type);

    try {
      let url = '';
      
      switch (type) {
        case 'env':
          url = '/.netlify/functions/debug-env';
          break;
        case 'openai':
          url = '/.netlify/functions/minimal-openai-test';
          break;
        case 'supabase':
          url = `/.netlify/functions/test-supabase-only?apartmentId=${apartmentId}&conversationId=${conversationId}`;
          break;
        case 'ai-response':
          url = '/.netlify/functions/test-ai-response';
          break;
        default:
          throw new Error('Type de test inconnu');
      }

      const response = await fetch(url);
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message || 'Erreur inconnue' });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Page de débogage
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="debug tabs">
          <Tab label="API Tests" {...a11yProps(0)} />
          <Tab label="Notifications Tests" {...a11yProps(1)} />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Tests disponibles
            </Typography>
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => runTest('env')}
              sx={{ mb: 2 }}
            >
              Vérifier les variables d'environnement
            </Button>
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => runTest('openai')}
              sx={{ mb: 2 }}
            >
              Tester OpenAI uniquement
            </Button>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Test Supabase
            </Typography>
            
            <TextField
              label="ID de l'appartement"
              value={apartmentId}
              onChange={(e) => setApartmentId(e.target.value)}
              fullWidth
              margin="normal"
              size="small"
            />
            
            <TextField
              label="ID de la conversation (optionnel)"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              fullWidth
              margin="normal"
              size="small"
            />
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => runTest('supabase')}
              disabled={!apartmentId}
              sx={{ mt: 2 }}
            >
              Tester Supabase uniquement
            </Button>
            
            <Divider sx={{ my: 2 }} />
            
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={() => runTest('ai-response')}
              sx={{ mt: 2 }}
            >
              Test complet AI Response
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '500px',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Résultats du test: {testType}
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <CircularProgress />
              </Box>
            ) : result ? (
              <Box 
                sx={{ 
                  mt: 2, 
                  p: 2, 
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: '450px'
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Typography variant="body1" color="text.secondary">
                  Exécutez un test pour voir les résultats
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <NotificationTest />
      </TabPanel>
    </Container>
  );
};

export default DebugPage;
