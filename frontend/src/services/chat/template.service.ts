import { supabase } from '../../lib/supabase';

export interface Template {
  id: string;
  name: string;
  content: string;
  language: string;
  variables: Record<string, any>;
  description?: string;
  created_at: string;
}

export class TemplateService {
  static async getTemplates() {
    // Récupérer la session pour obtenir l'ID de l'utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    console.log('Récupération des templates pour l\'utilisateur:', userId);
    
    // Récupérer uniquement les templates associés à l'utilisateur connecté
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('host_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des templates:', error);
      throw error;
    }
    
    console.log('Templates récupérés:', data?.length || 0);
    return data as Template[];
  }

  static async sendTemplate(
    conversationId: string, 
    guestPhone: string, 
    template: Template
  ) {
    // Récupérer la session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('Non authentifié');
    }

    console.log('[TemplateService] Envoi du template via Edge Function Supabase:', {
      template_name: template.name,
      language: template.language,
      to: guestPhone
    });
    
    // Utiliser l'URL Supabase depuis l'environnement ou la valeur par défaut
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tornfqtvnzkgnwfudxdb.supabase.co';
    
    // Envoyer le template via l'Edge Function Supabase
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        template_name: template.name,
        language: template.language,
        to: guestPhone
      })
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result?.error || `Erreur ${response.status}: ${response.statusText}`);
    }

    // Créer le message dans la base de données avec le contenu réel du template
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: template.content,
        direction: 'outbound',
        type: 'template',
        status: 'sent',
        metadata: {
          template_name: template.name,
          template_id: template.id
        }
      });

    if (msgError) throw msgError;
  }
}
