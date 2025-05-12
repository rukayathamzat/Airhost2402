import { supabase } from '../lib/supabase';

export class MobileNotificationService {
  static async registerToken(token: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('fcm_tokens')
        .upsert({
          user_id: session.user.id,
          token,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      localStorage.setItem('fcm_token', token);
    } catch (error) {
      console.error('Error registering FCM token:', error);
      throw error;
    }
  }

  static async sendTestNotification(): Promise<void> {
    const token = localStorage.getItem('fcm_token');
    if (!token) {
      throw new Error('No FCM token found');
    }

    const response = await fetch('/.netlify/functions/fcm-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: 'Test Notification',
          body: 'This is a test notification'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }
  }
} 