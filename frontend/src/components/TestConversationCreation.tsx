import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Box, Button, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import { ConversationService } from '../services/conversation.service';
import { Conversation } from '../types/conversation';

const TestConversationCreation = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; conversation?: Conversation }>
    ({ success: false, message: '' });
  const [guestName, setGuestName] = useState('Invité Test');
  const [guestPhone, setGuestPhone] = useState('+33612345678');

  const testCreateConversation = async () => {
    setLoading(true);
    setResult({ success: false, message: 'Traitement en cours...' });

    try {
      // 1. Obtenir l'ID utilisateur actuel
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }
      const userId = session.user.id;

      // 2. Récupérer une propriété pour le test
      const { data: properties, error: propertyError } = await supabase
        .from('apartments')
        .select('id, name')
        .eq('host_id', userId)
        .limit(1);

      if (propertyError) throw propertyError;
      if (!properties || properties.length === 0) {
        throw new Error('Aucune propriété trouvée. Veuillez créer une propriété d\'abord.');
      }

      const propertyId = properties[0].id;
      const propertyName = properties[0].name;

      // 3. Créer la conversation
      // Dates: aujourd'hui + 2 jours et aujourd'hui + 5 jours
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 2);
      
      const checkOutDate = new Date();
      checkOutDate.setDate(checkOutDate.getDate() + 5);
      
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      const { conversation, isNew } = await ConversationService.createConversation({
        host_id: userId,
        guest_name: guestName,
        guest_phone: guestPhone,
        property_id: propertyId,
        check_in_date: formatDate(checkInDate),
        check_out_date: formatDate(checkOutDate)
      });

      setResult({
        success: true,
        message: isNew 
          ? `Nouvelle conversation créée avec succès pour la propriété "${propertyName}"` 
          : `Conversation existante trouvée pour la propriété "${propertyName}"`,
        conversation
      });

    } catch (error) {
      console.error('Erreur lors du test:', error);
      setResult({
        success: false,
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Test de création de conversation
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Nom de l'invité"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Téléphone de l'invité"
          value={guestPhone}
          onChange={(e) => setGuestPhone(e.target.value)}
          sx={{ mb: 2 }}
          helperText="Format international, ex: +33612345678"
        />
        <Button
          variant="contained"
          onClick={testCreateConversation}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          Créer une conversation de test
        </Button>
      </Box>

      {result.message && (
        <Alert severity={result.success ? "success" : "error"} sx={{ mb: 3 }}>
          {result.message}
        </Alert>
      )}

      {result.conversation && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Détails de la conversation
          </Typography>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result.conversation, null, 2)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TestConversationCreation;
