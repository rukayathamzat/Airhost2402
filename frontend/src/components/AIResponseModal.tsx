import { useState } from 'react';
import { AIResponseService } from '../services/ai-response.service';
import './AIResponseModal.css';
import { AutoAwesome, Send, Edit, Close } from '@mui/icons-material';

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

  const handleGenerate = async () => {
    console.log('Génération démarrée avec:', { apartmentId, conversationId });
    try {
      setLoading(true);
      setError('');
      setResponse(''); // Réinitialiser toute réponse existante
      
      console.log('Appel du service AI...');
      // S'assurer que apartmentId a une valeur par défaut si non fourni
      const apartmentIdToUse = apartmentId || 'default';
      const aiResponse = await AIResponseService.generateResponse(
        apartmentIdToUse, 
        conversationId
      );
      
      console.log('Réponse IA reçue avec succès:', aiResponse);
      
      // Validation supplémentaire de la réponse
      if (!aiResponse || aiResponse.trim() === '') {
        throw new Error('La réponse générée est vide');
      }
      
      if (aiResponse.startsWith('Template envoyé:')) {
        throw new Error('Type de réponse incorrect');
      }
      
      setResponse(aiResponse);
    } catch (err: any) {
      console.error('Erreur lors de la génération:', err);
      setError(err.message || 'Erreur de génération');
      setResponse(''); // Réinitialiser en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!response.trim()) {
      setError('La réponse est vide. Veuillez générer une réponse avant d\'envoyer.');
      return;
    }
    
    console.log('Envoi de la réponse générée par IA:', response);
    
    // Envoyer la réponse au parent (utiliser onResponseGenerated ou onSend)
    if (onResponseGenerated) {
      onResponseGenerated(response);
    } else if (onSend) {
      onSend(response);
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
              <div className="response-preview">
                {response}
              </div>
              <div className="action-buttons">
                <button onClick={handleSend} className="send-btn">
                  <Send fontSize="small" />
                  Envoyer
                </button>
                <button onClick={() => setResponse('')} className="edit-btn">
                  <Edit fontSize="small" />
                  Régénérer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}