import { useState, useEffect } from 'react';
import { Typography, Box, FormControl, Select, MenuItem, Switch, FormControlLabel, Button, TextField, IconButton, Collapse } from '@mui/material';
import { supabase } from '../lib/supabase';
import { ExpandMore, Send, DeleteOutline, SettingsOutlined } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

interface Property {
  id: string;
  name: string;
  location: string;
  ai_instructions?: string;
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isUser: boolean;
}

const ChatSandbox: React.FC = () => {
  // États
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [isReservation, setIsReservation] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState<boolean>(false);
  const [customInstructions, setCustomInstructions] = useState<string>('');

  const navigate = useNavigate();

  // Charger les propriétés
  useEffect(() => {
    const loadProperties = async () => {
      try {
        // Vérifier que l'utilisateur est authentifié
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          console.error('Utilisateur non authentifié');
          toast.error("Vous devez être connecté pour accéder à cette page");
          navigate('/login');
          return;
        }

        const { data, error } = await supabase
          .from('properties')
          .select('id, name, location, ai_instructions');
        
        if (error) throw error;
        
        if (data) {
          setProperties(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des propriétés:', error);
        toast.error("Impossible de charger les propriétés");
      }
    };
    
    loadProperties();
  }, []);

  // Effacer la conversation
  const handleClearConversation = () => {
    setMessages([]);
    toast.info("Conversation effacée");
  };

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!selectedProperty) {
      toast.warning("Veuillez sélectionner une propriété");
      return;
    }
    
    // Ajouter le message utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      timestamp: new Date().toISOString(),
      isUser: true
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);
    
    try {
      // Récupérer la propriété sélectionnée
      const property = properties.find(p => p.id === selectedProperty);
      if (!property) throw new Error("Propriété non trouvée");
      
      // Créer une conversation temporaire pour le test
      const sandboxConversationId = `sandbox-${Date.now()}`;
      
      // Préparer la requête à la fonction Netlify
      const payload = {
        apartmentId: selectedProperty,
        conversationId: sandboxConversationId,
        messages: messages.map(msg => ({
          content: msg.content,
          direction: msg.isUser ? 'inbound' : 'outbound',
          created_at: msg.timestamp
        })).concat([{
          content: newMessage,
          direction: 'inbound',
          created_at: new Date().toISOString()
        }]),
        customInstructions: advancedSettingsOpen && customInstructions ? customInstructions : undefined,
        isReservation
      };
      
      // Appeler la fonction Netlify
      console.log('Appel du service AI en mode sandbox...');
      const response = await fetch('/.netlify/functions/generate-ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Ajouter la réponse de l'IA
      const aiResponse: Message = {
        id: Date.now().toString(),
        content: data.response,
        timestamp: new Date().toISOString(),
        isUser: false
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Erreur lors de la génération de la réponse IA:', error);
      toast.error("Erreur lors de la génération de la réponse IA");
      
      // Indiquer que l'IA n'a pas pu répondre
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Désolé, je n'ai pas pu générer une réponse. Veuillez réessayer.",
        timestamp: new Date().toISOString(),
        isUser: false
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Typography variant="h6">Chat Sandbox</Typography>
        <Typography variant="body2" color="textSecondary">
          Testez les réponses de l'IA pour différentes propriétés et contextes.
        </Typography>
        
        {/* Sélecteur de propriété */}
        <FormControl fullWidth sx={{ my: 2 }}>
          <Select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value as string)}
            displayEmpty
          >
            <MenuItem value="" disabled>
              Select a property
            </MenuItem>
            {properties.map((property) => (
              <MenuItem key={property.id} value={property.id}>
                {property.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Toggle pour la réservation */}
        <FormControlLabel
          control={
            <Switch
              checked={isReservation}
              onChange={(e) => setIsReservation(e.target.checked)}
            />
          }
          label="À une réservation"
        />
        
        {/* Paramètres avancés */}
        <Button
          startIcon={<SettingsOutlined />}
          onClick={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
          endIcon={<ExpandMore />}
          sx={{ mt: 1 }}
        >
          Paramètres avancés
        </Button>
        
        <Collapse in={advancedSettingsOpen}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">Instructions personnalisées pour l'IA:</Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="Saisissez des instructions spécifiques pour cette session..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
        </Collapse>
      </Box>
      
      {/* Zone de conversation */}
      {selectedProperty && (
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          borderTop: '1px solid #e0e0e0' 
        }}>
          {/* En-tête */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 2, 
            borderBottom: '1px solid #e0e0e0' 
          }}>
            <Box>
              <Typography variant="subtitle1">
                {properties.find(p => p.id === selectedProperty)?.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {properties.find(p => p.id === selectedProperty)?.location}
              </Typography>
            </Box>
            <IconButton onClick={handleClearConversation} title="Effacer la conversation">
              <DeleteOutline />
            </IconButton>
          </Box>
          
          {/* Messages */}
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2 
          }}>
            {messages.length === 0 ? (
              <Typography variant="body2" color="textSecondary" align="center" sx={{ my: 4 }}>
                Envoyez un message pour commencer la conversation
              </Typography>
            ) : (
              messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    alignSelf: message.isUser ? 'flex-end' : 'flex-start',
                    backgroundColor: message.isUser ? '#e9fae9' : '#f5f5f5',
                    borderRadius: 2,
                    p: 2,
                    maxWidth: '80%'
                  }}
                >
                  <Typography variant="body1">{message.content}</Typography>
                  <Typography 
                    variant="caption" 
                    color="textSecondary"
                    sx={{ 
                      display: 'block', 
                      textAlign: message.isUser ? 'right' : 'left',
                      mt: 0.5 
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              ))
            )}
            
            {isLoading && (
              <Box sx={{ alignSelf: 'flex-start', p: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  • L'IA est en train d'écrire...
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Saisie de message */}
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid #e0e0e0',
            display: 'flex', 
            alignItems: 'center'
          }}>
            <TextField
              fullWidth
              placeholder="Tapez un message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              variant="outlined"
              size="small"
            />
            <IconButton 
              color="primary" 
              onClick={handleSendMessage} 
              disabled={isLoading || !newMessage.trim()}
              sx={{ ml: 1 }}
            >
              <Send />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ChatSandbox;
