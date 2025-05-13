import { Request, Response } from 'express';
import { createHmac } from 'crypto';
import { supabase } from '../lib/supabase';
import { WhatsAppService } from '../services/whatsapp.service';

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
}

export class WebhookController {
  // Vérification du webhook (GET)
  async verify(req: Request, res: Response) {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode !== 'subscribe' || !token || !challenge) {
        return res.sendStatus(400);
      }

      // Vérifier le token dans la base de données
      const { data: host } = await supabase
        .from('hosts')
        .select('id')
        .eq('verify_token', token)
        .single();

      if (!host) {
        return res.sendStatus(403);
      }

      return res.status(200).send(challenge);
    } catch (error) {
      console.error('Webhook verification error:', error);
      return res.sendStatus(500);
    }
  }

  // Réception des messages (POST)
  async handleMessage(req: Request, res: Response) {
    try {
      // 1. Vérifier la signature
      const signature = req.header('x-hub-signature-256');
      if (!this.verifySignature(req.body, signature)) {
        return res.sendStatus(401);
      }

      // 2. Extraire les informations du message
      const { entry } = req.body;
      if (!entry?.[0]?.changes?.[0]?.value) {
        return res.sendStatus(400);
      }

      const { metadata, messages } = entry[0].changes[0].value;
      const phoneNumberId = metadata.phone_number_id;

      // 3. Trouver l'hôte correspondant
      const { data: host } = await supabase
        .from('hosts')
        .select('id')
        .eq('phone_number_id', phoneNumberId)
        .single();

      if (!host) {
        return res.sendStatus(404);
      }

      // 4. Traiter chaque message
      for (const message of messages || []) {
        await this.processMessage(host.id, message);
      }

      // 5. Répondre rapidement (< 20 secondes)
      return res.sendStatus(200);
    } catch (error) {
      console.error('Webhook handling error:', error);
      return res.sendStatus(500);
    }
  }

  private async processMessage(hostId: string, message: WebhookMessage) {
    try {
      // 1. Trouver ou créer la conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, property_id, created_at')
        .eq('guest_number', message.from)
        .single();

      // 2. Vérifier la fenêtre de 24h si c'est une conversation existante
      if (conversation) {
        const lastMessageTime = new Date(conversation.created_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          // Après 24h, on ne peut répondre qu'avec des templates
          await this.sendTemplateResponse(hostId, message.from);
          return;
        }
      }

      // 3. Enregistrer le message
      await supabase.from('messages').insert({
        conversation_id: conversation?.id,
        content: message.text?.body || '',
        type: 'text',
        direction: 'inbound'
      });

      // 4. Mettre à jour le compteur de messages non lus
      if (conversation) {
        await supabase
          .from('conversations')
          .update({ 
            unread_count: conversation.unread_count + 1,
            last_message: message.text?.body,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversation.id);
      }
    } catch (error) {
      console.error('Message processing error:', error);
      throw error;
    }
  }

  private async sendTemplateResponse(hostId: string, to: string) {
    // Envoyer un template par défaut pour réinitier la conversation
    await WhatsAppService.sendTemplate(
      hostId,
      to,
      'customer_support.conversation_expired',
      'fr'
    );
  }

  private verifySignature(payload: any, signature?: string): boolean {
    if (!signature || !process.env.WHATSAPP_APP_SECRET) return false;

    const hmac = createHmac('sha256', process.env.WHATSAPP_APP_SECRET);
    hmac.update(JSON.stringify(payload));
    const expected = `sha256=${hmac.digest('hex')}`;

    return signature === expected;
  }
}
