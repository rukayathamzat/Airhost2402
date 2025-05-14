import { supabase } from '../../lib/supabase';

export interface MobileNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  token?: string;
  userId?: string;
}

export class MobileNotificationService {
  private static instance: MobileNotificationService;

  private constructor() {}

  public static getInstance(): MobileNotificationService {
    if (!MobileNotificationService.instance) {
      MobileNotificationService.instance = new MobileNotificationService();
    }
    return MobileNotificationService.instance;
  }

  public async sendNotification(notification: MobileNotification): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: notification
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending mobile notification:', error);
      throw error;
    }
  }

  public async registerDeviceToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('device_tokens')
        .upsert({ user_id: userId, token });

      if (error) throw error;
    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }
} 