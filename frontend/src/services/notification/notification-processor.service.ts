import { NotificationService } from './notification.service';
import { MobileNotificationService } from './mobile-notification.service';

/**
 * Service pour traiter la file d'attente des notifications
 */
export class NotificationProcessorService {
  private static instance: NotificationProcessorService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): NotificationProcessorService {
    if (!NotificationProcessorService.instance) {
      NotificationProcessorService.instance = new NotificationProcessorService();
    }
    return NotificationProcessorService.instance;
  }

  public static async init(): Promise<void> {
    const instance = NotificationProcessorService.getInstance();
    if (!instance.initialized) {
      await NotificationService.init();
      await MobileNotificationService.init();
      instance.initialized = true;
    }
  }

  public async processNotification(userId: string, message: string, isMobile: boolean = false): Promise<void> {
    try {
      if (isMobile) {
        await MobileNotificationService.getInstance().sendMobileNotification(userId, 'New Message', message);
      } else {
        await NotificationService.getInstance().sendNotification(userId, message);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
      throw error;
    }
  }
} 