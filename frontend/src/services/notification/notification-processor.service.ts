import { NotificationService } from './notification.service';
import { MobileNotificationService } from './mobile-notification.service';

export class NotificationProcessorService {
  private static instance: NotificationProcessorService;
  private notificationService: NotificationService;
  private mobileNotificationService: MobileNotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
    this.mobileNotificationService = MobileNotificationService.getInstance();
  }

  public static getInstance(): NotificationProcessorService {
    if (!NotificationProcessorService.instance) {
      NotificationProcessorService.instance = new NotificationProcessorService();
    }
    return NotificationProcessorService.instance;
  }

  public async processNotification(notification: any): Promise<void> {
    try {
      // Process the notification
      await this.notificationService.createNotification(notification);
      
      // Send mobile notification if needed
      if (notification.sendMobileNotification) {
        await this.mobileNotificationService.sendNotification(notification);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
      throw error;
    }
  }
} 