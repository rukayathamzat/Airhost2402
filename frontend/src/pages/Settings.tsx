import { useState } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Divider, 
  Box,
  Tabs,
  Tab
} from '@mui/material';
import NotificationToggle from '../components/Notifications/NotificationToggle';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SecurityIcon from '@mui/icons-material/Security';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
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
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.main', color: 'white', p: 2 }}>
          <Typography variant="h5" component="h1" display="flex" alignItems="center">
            <SettingsIcon sx={{ mr: 1 }} /> Paramètres
          </Typography>
        </Box>
        
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleChangeTab} 
              aria-label="settings tabs"
              variant="fullWidth"
            >
              <Tab icon={<NotificationsIcon />} label="Notifications" {...a11yProps(0)} />
              <Tab icon={<AccountCircleIcon />} label="Profil" {...a11yProps(1)} />
              <Tab icon={<SecurityIcon />} label="Sécurité" {...a11yProps(2)} />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Gérer les notifications
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configurez les notifications pour rester informé des nouveaux messages de vos clients, même lorsque vous n'êtes pas sur l'application.
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <NotificationToggle />
              
              <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  À propos des notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Les notifications push vous permettent de recevoir des alertes lorsque vous recevez de nouveaux messages, même lorsque l'application est fermée ou que votre navigateur est en arrière-plan.
                  <br /><br />
                  Pour utiliser cette fonctionnalité, vous devez autoriser les notifications dans votre navigateur.
                </Typography>
              </Paper>
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6">Paramètres du profil</Typography>
            <Typography variant="body2" color="text.secondary">
              Cette section sera bientôt disponible.
            </Typography>
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6">Paramètres de sécurité</Typography>
            <Typography variant="body2" color="text.secondary">
              Cette section sera bientôt disponible.
            </Typography>
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings;
