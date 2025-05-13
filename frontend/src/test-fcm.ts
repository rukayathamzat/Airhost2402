import { supabase } from './lib/supabase';
import { MobileNotificationService } from './services/notification/mobile-notification.service';
import { NotificationService } from './services/notification/notification.service';

// Token FCM fictif pour les tests - à remplacer par un vrai token en production
const TEST_FCM_TOKEN = 'test-fcm-token';

async function testNotifications() {
  try {
    console.log('Initialisation des services de notification...');
    await NotificationService.init();
    
    console.log('Enregistrement du token FCM de test...');
    await MobileNotificationService.registerToken(TEST_FCM_TOKEN);
    
    console.log('Test d\'appel direct à l\'Edge Function...');
    const { data, error } = await supabase.functions.invoke('fcm-proxy', {
      body: {
        to: TEST_FCM_TOKEN,
        notification: {
          title: 'Test direct',
          body: 'Message de test direct pour FCM'
        },
        data: {
          type: 'test'
        }
      }
    });
    
    if (error) {
      console.error('Erreur lors de l\'appel direct:', error);
    } else {
      console.log('Résultat de l\'appel direct:', data);
    }
    
    console.log('Test d\'envoi de notification via NotificationService...');
    const testMessage = {
      id: 'test-id-' + Date.now(),
      content: 'Ceci est un message de test',
      conversation_id: 'test-conversation',
      direction: 'inbound' as 'inbound', // Type assertion pour garantir le type attendu
      created_at: new Date().toISOString()
    };
    
    await NotificationService.notifyNewMessage(testMessage);
    console.log('Test terminé!');
  } catch (error) {
    console.error('Erreur lors des tests:', error);
  }
}

// Exécuter les tests
testNotifications();
