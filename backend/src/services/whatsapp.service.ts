import axios from 'axios';
import { supabase } from '../lib/supabase';

export class WhatsAppService {
  private static baseUrl = 'https://graph.facebook.com/v16.0';

  static async sendMessage(userId: string, to: string, message: string) {
    try {
      // Récupérer les credentials de l'utilisateur
      const { data: host } = await supabase
        .from('hosts')
        .select('phone_number_id, whatsapp_access_token')
        .eq('id', userId)
        .single();

      if (!host) throw new Error('Host not found');

      const response = await axios.post(
        `${this.baseUrl}/${host.phone_number_id}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${host.whatsapp_access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw error;
    }
  }

  static async sendTemplate(
    userId: string,
    to: string,
    templateName: string,
    language: string = "fr",
    components: any[] = []
  ) {
    try {
      const { data: host } = await supabase
        .from('hosts')
        .select('phone_number_id, whatsapp_access_token')
        .eq('id', userId)
        .single();

      if (!host) throw new Error('Host not found');

      const response = await axios.post(
        `${this.baseUrl}/${host.phone_number_id}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: language
            },
            components
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${host.whatsapp_access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('WhatsApp template send error:', error);
      throw error;
    }
  }
}
