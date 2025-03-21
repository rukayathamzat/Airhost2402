import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.tsx'
import theme from './theme'
import { NotificationService } from './services/notification/notification.service'

// Initialiser le service de notification
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    NotificationService.init().catch(error => {
      console.error('Erreur lors de l\'initialisation du service de notification:', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
