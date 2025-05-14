import { useState } from 'react';
import { AIResponseService } from '../services/ai-response.service';
import './AIResponseModal.css';
import { AutoAwesome, Send, Edit, Close } from '@mui/icons-material';
import { TextField, Box } from '@mui/material';

interface AIResponseModalProps {
  apartmentId?: string; // Optional pour compatibilité avec l'usage actuel
  conversationId: string;
  onResponseGenerated?: (response: string) => void; // Alias pour onSend
  onSend?: (response: string) => void;
  onClose: () => void;
  open: boolean; // Nouveau prop pour contrôler l'ouverture
  guestName?: string; // Nom de l'invité pour personnalisation
}

export default function AIResponseModal({ 
  apartmentId, 
  conversationId, 
  onSend, 
  onResponseGenerated,
  onClose, 
  open,
  guestName = ''
}: AIResponseModalProps) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedResponse, setEditedResponse] = useState('');

  const handleGenerate = async () => {
    console.log('Génération démarrée avec:', { apartmentId, conversationId });
    try {
      setLoading(true);
      setError('');
      setResponse('');
      setIsEditing(false);
      
      console.log('Appel du service AI...');
      // S'assurer que apartmentId a une valeur par défaut si non fourni
      const apartmentIdToUse = apartmentId || 'default';
      const aiResponses = await AIResponseService.generateResponse(
        apartmentIdToUse, 
        conversationId
      );
      
      console.log('Réponse IA reçue avec succès:', aiResponses);
      
      // Validation supplémentaire de la réponse
      if (!aiResponses || !Array.isArray(aiResponses) || aiResponses.length === 0) {
        throw new Error('Aucune réponse générée');
      }

      // Prendre la première réponse du tableau
      const firstResponse = aiResponses[0];
      
      if (!firstResponse || typeof firstResponse !== 'string' || firstResponse.trim() === '') {
        throw new Error('La réponse générée est vide');
      }
      
      if (firstResponse.startsWith('Template envoyé:')) {
        throw new Error('Type de réponse incorrect');
      }
      
      setResponse(firstResponse);
      setEditedResponse(firstResponse);
    } catch (err: any) {
      console.error('Erreur lors de la génération:', err);
      setError(err.message || 'Erreur de génération');
      setResponse(''); // Réinitialiser en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setResponse(editedResponse);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedResponse(response);
    setIsEditing(false);
  };

  const handleSend = () => {
    const responseToSend = isEditing ? editedResponse : response;
    if (!responseToSend.trim()) {
      setError('La réponse est vide. Veuillez générer une réponse avant d\'envoyer.');
      return;
    }
    
    console.log('Envoi de la réponse générée par IA:', responseToSend);
    
    // Envoyer la réponse au parent (utiliser onResponseGenerated ou onSend)
    if (onResponseGenerated) {
      onResponseGenerated(responseToSend);
    } else if (onSend) {
      onSend(responseToSend);
    }
    
    // Fermer la modal
    onClose();
  };

  // Si le modal n'est pas ouvert, ne rien rendre
  if (!open) return null;
  
  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal">
        <div className="ai-modal-header">
          <h3>Réponse IA</h3>
          <button onClick={onClose} className="close-btn">
            <Close />
          </button>
        </div>

        <div className="ai-modal-content">
          {!response && !loading && (
            <div className="generate-section">
              <p>Générer une réponse personnalisée{guestName ? ` pour ${guestName}` : ''} avec l'IA</p>
              <button 
                onClick={handleGenerate} 
                className="generate-btn"
                disabled={loading}
              >
                <AutoAwesome fontSize="small" />
                {loading ? 'Génération...' : 'Générer'}
              </button>
            </div>
          )}

          {loading && (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>L'IA génère votre réponse...</p>
            </div>
          )}

          {error && (
            <div className="error-section">
              <p className="error-message">{error}</p>
              <button onClick={handleGenerate} className="retry-btn">
                Réessayer
              </button>
            </div>
          )}

          {response && (
            <div className="response-section">
              {isEditing ? (
                <Box sx={{ width: '100%', mb: 2 }}>
                  <TextField
                    multiline
                    fullWidth
                    rows={4}
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  <div className="action-buttons">
                    <button onClick={handleSaveEdit} className="send-btn">
                      <Send fontSize="small" />
                      Enregistrer
                    </button>
                    <button onClick={handleCancelEdit} className="edit-btn">
                      <Edit fontSize="small" />
                      Annuler
                    </button>
                  </div>
                </Box>
              ) : (
                <>
                  <div className="response-preview">
                    {response}
                  </div>
                  <div className="action-buttons">
                    <button onClick={handleSend} className="send-btn">
                      <Send fontSize="small" />
                      Envoyer
                    </button>
                    <button onClick={handleEdit} className="edit-btn">
                      <Edit fontSize="small" />
                      Modifier
                    </button>
                    <button onClick={() => setResponse('')} className="edit-btn">
                      <AutoAwesome fontSize="small" />
                      Régénérer
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}