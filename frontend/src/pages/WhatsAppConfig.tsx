import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import '../styles/WhatsAppConfig.css';

const WhatsAppConfig: React.FC = () => {
  const [config, setConfig] = useState({
    apiKey: '',
    phoneNumberId: '',
    verificationToken: '',
    enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .single();

      if (error) {
        console.error('Erreur lors de la récupération de la configuration WhatsApp:', error);
        toast.error('Erreur lors de la récupération de la configuration');
      } else if (data) {
        setConfig({
          apiKey: data.api_key || '',
          phoneNumberId: data.phone_number_id || '',
          verificationToken: data.verification_token || '',
          enabled: data.enabled || false
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert({
          id: 1, // Utiliser un ID fixe pour une configuration unique
          api_key: config.apiKey,
          phone_number_id: config.phoneNumberId,
          verification_token: config.verificationToken,
          enabled: config.enabled,
          updated_at: new Date()
        });

      if (error) {
        console.error('Erreur lors de la sauvegarde de la configuration:', error);
        toast.error('Erreur lors de la sauvegarde');
      } else {
        toast.success('Configuration sauvegardée avec succès');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setConfig({
      ...config,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  if (loading) {
    return <div className="loading">Chargement de la configuration...</div>;
  }

  return (
    <div className="whatsapp-config-container">
      <h1>Configuration WhatsApp</h1>
      <p className="description">
        Configurez les paramètres de connexion à l'API WhatsApp Business pour permettre l'envoi de messages.
      </p>

      <div className="form-group">
        <label htmlFor="apiKey">Clé API WhatsApp</label>
        <input
          type="password"
          id="apiKey"
          name="apiKey"
          value={config.apiKey}
          onChange={handleChange}
          placeholder="Entrez votre clé API WhatsApp"
        />
        <small className="help-text">Votre clé secrète pour l'API WhatsApp Business</small>
      </div>

      <div className="form-group">
        <label htmlFor="phoneNumberId">ID du numéro de téléphone</label>
        <input
          type="text"
          id="phoneNumberId"
          name="phoneNumberId"
          value={config.phoneNumberId}
          onChange={handleChange}
          placeholder="Exemple: 123456789012345"
        />
        <small className="help-text">L'identifiant de votre numéro de téléphone WhatsApp Business</small>
      </div>

      <div className="form-group">
        <label htmlFor="verificationToken">Token de vérification</label>
        <input
          type="text"
          id="verificationToken"
          name="verificationToken"
          value={config.verificationToken}
          onChange={handleChange}
          placeholder="Token pour webhook verification"
        />
        <small className="help-text">Utilisé pour vérifier les webhooks entrants</small>
      </div>

      <div className="form-group checkbox-group">
        <label htmlFor="enabled" className="checkbox-label">
          <input
            type="checkbox"
            id="enabled"
            name="enabled"
            checked={config.enabled}
            onChange={handleChange}
          />
          Activer l'intégration WhatsApp
        </label>
        <small className="help-text">Activez ou désactivez l'envoi de messages WhatsApp</small>
      </div>

      <div className="button-group">
        <button 
          onClick={saveConfig} 
          disabled={saving} 
          className="save-button"
        >
          {saving ? 'Sauvegarde en cours...' : 'Sauvegarder la configuration'}
        </button>
        <button 
          onClick={fetchConfig} 
          disabled={loading} 
          className="refresh-button"
        >
          Rafraîchir
        </button>
      </div>
    </div>
  );
};

export default WhatsAppConfig;
