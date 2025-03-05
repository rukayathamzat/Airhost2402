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
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
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

    // Envoyer le template via la fonction Edge
    const response = await fetch(`/.netlify/functions/send-whatsapp-template`, {
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

    // Créer le message dans la base de données
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: `Template envoyé: ${template.name}`,
        direction: 'outbound',
        type: 'template',
        status: 'sent'
      });

    if (msgError) throw msgError;
  }
}
