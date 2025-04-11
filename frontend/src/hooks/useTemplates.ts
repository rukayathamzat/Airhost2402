import { useState, useEffect } from 'react';
import { TemplateService, Template } from '../services/chat/template.service';

// Préfixe pour les logs liés à ce hook
const DEBUG_PREFIX = 'DEBUG_USE_TEMPLATES';

interface UseTemplatesResult {
  templates: Template[];
  loading: boolean;
  error: string | null;
  refreshTemplates: () => Promise<void>;
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour charger les templates
  const loadTemplates = async () => {
    try {
      console.log(`${DEBUG_PREFIX} Chargement des templates...`);
      setLoading(true);
      setError(null);
      
      const fetchedTemplates = await TemplateService.getTemplates();
      
      console.log(`${DEBUG_PREFIX} ${fetchedTemplates.length} templates récupérés`);
      setTemplates(fetchedTemplates);
    } catch (err) {
      console.error(`${DEBUG_PREFIX} Erreur lors du chargement des templates:`, err);
      setError('Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  };

  // Charger les templates au montage du composant
  useEffect(() => {
    loadTemplates();
  }, []);

  // Fonction pour forcer le rafraîchissement des templates
  const refreshTemplates = async () => {
    await loadTemplates();
  };

  return {
    templates,
    loading,
    error,
    refreshTemplates
  };
}
