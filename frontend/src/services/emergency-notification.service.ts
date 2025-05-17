import { supabase } from '../lib/supabase';
import { MobileNotificationService } from './notification/mobile-notification.service';
import { NotificationService } from './notification/notification.service';

export interface EmergencyNotification {
  propertyId: string;
  message: string;
  severity: 'immediate' | 'urgent' | 'standard';
  detectedKeywords: string[];
  emergencyCaseId?: string;
  emergencyCaseName?: string;
}

export class EmergencyNotificationService {
  private static instance: EmergencyNotificationService;

  private constructor() {}

  public static getInstance(): EmergencyNotificationService {
    if (!EmergencyNotificationService.instance) {
      EmergencyNotificationService.instance = new EmergencyNotificationService();
    }
    return EmergencyNotificationService.instance;
  }

  public async sendEmergencyNotification(notification: EmergencyNotification): Promise<void> {
    try {
      // 1. Log the emergency notification
      const { data: logData, error: logError } = await supabase
        .from('emergency_detection_logs')
        .insert({
          property_id: notification.propertyId,
          emergency_case_id: notification.emergencyCaseId,
          message: notification.message,
          matched_keywords: notification.detectedKeywords,
          detected_at: new Date().toISOString(),
          notification_status: 'pending'
        })
        .select()
        .single();

      if (logError) throw logError;

      // 2. Get all property managers for this property
      const { data: managers, error: managersError } = await supabase
        .from('property_managers')
        .select('user_id')
        .eq('property_id', notification.propertyId);

      if (managersError) throw managersError;

      // 3. Send notifications to all managers
      const notificationPromises = managers.map(async (manager) => {
        try {
          // Send web notification
          await NotificationService.notifyNewMessage({
            id: logData.id,
            content: this.formatEmergencyMessage(notification),
            conversation_id: 'emergency',
            direction: 'inbound',
            created_at: new Date().toISOString()
          });

          // Send mobile notification if available
          const mobileService = MobileNotificationService.getInstance();
          await mobileService.sendNotification({
            title: this.getEmergencyTitle(notification.severity),
            body: this.formatEmergencyMessage(notification),
            data: {
              type: 'emergency',
              severity: notification.severity,
              propertyId: notification.propertyId,
              emergencyCaseId: notification.emergencyCaseId,
              timestamp: new Date().toISOString()
            }
          });

          // Update notification status
          await supabase
            .from('emergency_detection_logs')
            .update({
              notification_status: 'sent',
              notification_sent: true,
              notification_sent_at: new Date().toISOString()
            })
            .eq('id', logData.id);

        } catch (error: any) {
          console.error('Error sending emergency notification to manager:', error);
          // Update notification status to failed
          await supabase
            .from('emergency_detection_logs')
            .update({
              notification_status: 'failed',
              notification_error: error?.message || 'Unknown error'
            })
            .eq('id', logData.id);
        }
      });

      await Promise.all(notificationPromises);

    } catch (error) {
      console.error('Error in emergency notification service:', error);
      throw error;
    }
  }

  private formatEmergencyMessage(notification: EmergencyNotification): string {
    const severityText = {
      immediate: '🚨 IMMEDIATE EMERGENCY',
      urgent: '⚠️ URGENT',
      standard: 'ℹ️ Emergency'
    }[notification.severity];

    return `${severityText}\n\n${notification.message}\n\nDetected keywords: ${notification.detectedKeywords.join(', ')}`;
  }

  private getEmergencyTitle(severity: 'immediate' | 'urgent' | 'standard'): string {
    switch (severity) {
      case 'immediate':
        return '🚨 IMMEDIATE EMERGENCY';
      case 'urgent':
        return '⚠️ URGENT ALERT';
      case 'standard':
        return 'ℹ️ Emergency Alert';
    }
  }
} 