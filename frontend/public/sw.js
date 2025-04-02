// Service Worker intégré pour PWA et Firebase Cloud Messaging
// Import des scripts Firebase nécessaires
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

// Configuration Firebase - Paramètres publiques uniquement
const firebaseConfig = {
  apiKey: "AIzaSyC1ew_x6gQvsTdnJ-gTqVot2XPCa2qKXX0",
  authDomain: "airhost-d9c48.firebaseapp.com",
  projectId: "airhost-supabase", // ID correct du projet selon la console Firebase
  storageBucket: "airhost-d9c48.appspot.com",
  messagingSenderId: "107044522957",
  appId: "1:107044522957:web:ad4e9a0c48dc18cd2bb18e",
  // Ajout de la clé VAPID pour améliorer la compatibilité
  vapidKey: "BCeZrB7xYF6LkY0vq4NEG3AZaHaKHn2RrzzM5WYtBsQpdYkLQs0tkjx-hcN6XlmNNPt4cKpbLJEi6TP_Qqt7Jck"
};

// Variables d'état du Service Worker
let fcmToken = null;
let isMockToken = false;
let isMobileDevice = false;
let messaging = null;

// Détection de l'appareil mobile (utilisé pour personnaliser les notifications)
function detectMobileDevice() {
  try {
    // Utiliser le user agent si disponible
    if (self.navigator && self.navigator.userAgent) {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(self.navigator.userAgent);
    }
    // Fallback sur la détection du token
    return isMockToken && fcmToken && fcmToken.includes('mobile');
  } catch (e) {
    console.error('[SW MOBILE] Erreur lors de la détection mobile:', e);
    return false;
  }
}

// Initialisation de Firebase dans le Service Worker
try {
  firebase.initializeApp(firebaseConfig);
  messaging = firebase.messaging();
  console.log('[SW DEBUG] Firebase initialisé avec succès dans le service worker');
} catch (error) {
  console.error('[SW DEBUG] Erreur d\'initialisation Firebase dans le service worker:', error);
}

self.addEventListener('install', (event) => {
  console.log('[SW DEBUG] Service Worker installé');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW DEBUG] Service Worker activé');
  return self.clients.claim();
});

// Log au démarrage du service worker
console.log('[SW DEBUG] Service Worker chargé et en attente d\'événements');

// Gestion des notifications push WebPush classiques
self.addEventListener('push', (event) => {
  // Ajouter des logs spécifiques pour le débogage mobile
  console.log('[SW DEBUG] Notification push reçue', event);
  console.log('[SW MOBILE] UserAgent:', self.navigator ? self.navigator.userAgent : 'non disponible');
  console.log('[SW MOBILE] Est un appareil mobile:', detectMobileDevice());

  if (!event.data) {
    console.log('[SW DEBUG] Aucune donnée reçue');
    return;
  }

  try {
    const data = event.data.json();
    // Mettre à jour la détection mobile
    isMobileDevice = detectMobileDevice();
    console.log('[SW DEBUG] Données de notification reçues:', data);

    const options = {
      body: data.body || 'Nouveau message reçu',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        url: data.url || '/chat',
        conversationId: data.conversationId
      },
      actions: [
        {
          action: 'open',
          title: 'Ouvrir'
        },
        {
          action: 'close',
          title: 'Fermer'
        }
      ],
      vibrate: [100, 50, 100],
      timestamp: data.timestamp || Date.now()
    };

    console.log('[SW DEBUG] Tentative d\'affichage de notification avec:', {
      title: data.title || 'Airhost',
      options
    });
    
    const notificationPromise = self.registration.showNotification(data.title || 'Airhost', options);
    
    notificationPromise.then(() => {
      console.log('[SW DEBUG] Notification affichée avec succès');
    }).catch(err => {
      console.error('[SW DEBUG] Erreur lors de l\'affichage de la notification:', err);
    });
    
    event.waitUntil(notificationPromise);
  } catch (error) {
    console.error('[SW DEBUG] Erreur lors du traitement de la notification push:', error);
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW DEBUG] Clic sur la notification', event);
  console.log('[SW MOBILE] Notification clickée sur mobile:', event.notification.data?.isMobileDevice);

  // Fermer la notification immédiatement
  event.notification.close();

  if (event.action === 'close') {
    console.log('[SW DEBUG] Action de fermeture, pas de navigation');
    return;
  }

  const urlToOpen = event.notification.data?.url || '/chat';
  const conversationId = event.notification.data?.conversationId;
  const isMobileDevice = event.notification.data?.isMobileDevice || false;
  console.log('[SW DEBUG] Navigation vers:', { urlToOpen, conversationId, isMobileDevice });

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      console.log('[SW DEBUG] Clients fenêtre trouvés:', clientList.length);
      
      // Vérifier si une fenêtre est déjà ouverte et la focaliser
      for (const client of clientList) {
        console.log('[SW DEBUG] Vérification du client:', client.url);
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          console.log('[SW DEBUG] Client correspondant trouvé, focus');
          return client.focus();
        }
      }
      
      // Sinon, ouvrir une nouvelle fenêtre
      console.log('[SW DEBUG] Ouverture d\'une nouvelle fenêtre:', urlToOpen);
      return self.clients.openWindow(urlToOpen);
    }).catch(error => {
      console.error('[SW DEBUG] Erreur lors de la gestion du clic sur notification:', error);
    })
  );
});

// Gestionnaire de messages Firebase en arrière-plan (format mobile)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW DEBUG] Message FCM en arrière-plan reçu', payload);
  console.log('[SW MOBILE] Message en arrière-plan détecté sur appareil mobile:', detectMobileDevice());
  
  // Mettre à jour la détection mobile
  isMobileDevice = detectMobileDevice();
  
  try {
    // Déterminer si c'est un message de données uniquement ou si contient une notification
    if (payload.data) {
      console.log('[SW DEBUG] Données FCM reçues:', payload.data);
      
      // Vérifier si c'est un message sortant (envoyé par l'utilisateur)
      // Ne pas afficher de notification pour les messages sortants
      // Vérification plus stricte avec plusieurs conditions
      if (payload.data.isOutbound === 'true' || 
          payload.data.direction === 'outbound' || 
          payload.data.direction !== 'inbound') {
        console.log('[SW DEBUG] Message sortant ou non entrant détecté, pas de notification affichée');
        console.log('[SW DEBUG] Direction:', payload.data.direction);
        console.log('[SW DEBUG] isOutbound:', payload.data.isOutbound);
        return; // Sortir immédiatement sans afficher de notification
      }
      
      // Logs de débogage supplémentaires
      console.log('[SW DEBUG] Message entrant confirmé, notification autorisée');
      console.log('[SW DEBUG] Données du message:', JSON.stringify(payload.data));
      
      // Construire les options de notification à partir des données
      const notificationTitle = payload.data.title || payload.notification?.title || 'Airhost';
      const notificationOptions = {
        body: payload.data.body || payload.notification?.body || 'Nouveau message reçu',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        // Priorité élevée pour mobile
        priority: isMobileDevice ? 'high' : 'default',
        // Vibration plus forte pour mobile
        vibrate: isMobileDevice ? [300, 100, 300, 100, 300] : [100, 50, 100],
        // Garder la notification active plus longtemps sur mobile
        requireInteraction: isMobileDevice,
        // Forcer l'affichage sur mobile même en mode silencieux
        silent: false,
        data: {
          url: payload.data.url || '/chat',
          conversationId: payload.data.conversationId,
          timestamp: payload.data.timestamp || Date.now(),
          click_action: payload.data.click_action || 'FLUTTER_NOTIFICATION_CLICK',
          isMobileDevice: isMobileDevice
        },
        actions: [
          {
            action: 'open',
            title: 'Ouvrir'
          },
          {
            action: 'close',
            title: 'Fermer'
          }
        ],
        timestamp: new Date(payload.data.timestamp || Date.now())
      };
      
      console.log('[SW DEBUG] Affichage notification FCM:', { notificationTitle, notificationOptions });
      return self.registration.showNotification(notificationTitle, notificationOptions);
    } else if (payload.notification) {
      // Gérer les notifications directes de FCM (moins courantes)
      console.log('[SW DEBUG] Notification FCM standard reçue:', payload.notification);
      // Firebase gère automatiquement l'affichage de ces notifications
    }
  } catch (error) {
    console.error('[SW DEBUG] Erreur lors du traitement du message FCM en arrière-plan:', error);
  }
});

// Gestion des messages entre le service worker et l'application
self.addEventListener('message', (event) => {
  console.log('[SW DEBUG] Message reçu dans le service worker:', event.data);
  
  // Gestion des tokens FCM
  if (event.data && event.data.type === 'FCM_TOKEN_RECEIVED') {
    console.log('[SW DEBUG] Token FCM reçu de l\'application');
    fcmToken = event.data.token;
    isMockToken = event.data.isMockToken || false;
    console.log('[SW DEBUG] Token enregistré, type:', isMockToken ? 'simulé' : 'réel');
    
    // Confirmer la réception du token
    if (event.source) {
      event.source.postMessage({
        type: 'FCM_TOKEN_ACKNOWLEDGED',
        token: fcmToken,
        isMockToken: isMockToken
      });
    }
  }
  // Commande de mise à jour immédiate du service worker
  else if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW DEBUG] Exécution de skipWaiting() suite à la demande');
    self.skipWaiting();
  }
  // Commandes de test pour simuler les notifications
  else if (event.data && event.data.type === 'SIMULATE_NOTIFICATION') {
    console.log('[SW DEBUG] Simulation de notification demandée');
    simulateNotification(event.data.payload || createDefaultPayload());
  }
});

// Gestion de la fermeture d'une notification
self.addEventListener('notificationclose', (event) => {
  console.log('[SW DEBUG] Notification fermée', event);
});

// Fonctions utilitaires pour simuler des notifications

/**
 * Crée un payload de notification par défaut pour les tests
 * @returns {Object} Un payload de notification par défaut
 */
function createDefaultPayload() {
  return {
    data: {
      title: 'Notification de test Airhost',
      body: 'Ceci est une notification simulée pour tester le service worker',
      url: '/chat',
      timestamp: Date.now(),
      conversationId: 'test-' + Math.random().toString(36).substring(2, 10)
    }
  };
}

/**
 * Simule une notification push FCM en l'affichant directement
 * @param {Object} payload Le payload de la notification
 */
function simulateNotification(payload) {
  console.log('[SW DEBUG] Simulation d\'une notification avec payload:', payload);
  
  // Détection si c'est une notification mobile
  const isMobileDevice = payload.isMobileDevice || 
                         (payload.data && payload.data.isMobileDevice) ||
                         /mobile/i.test(payload.token || '');
  
  console.log('[SW MOBILE] Détection appareil mobile:', isMobileDevice);
  
  // Pour les tokens simulés, nous gérons nous-mêmes l'affichage de la notification
  const notificationTitle = payload.data.title || 'Airhost';
  const notificationOptions = {
    body: payload.data.body || 'Nouveau message reçu',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    // Priorité élevée pour mobile
    priority: isMobileDevice ? 'high' : 'default',
    // Vibration pour mobile (300ms on, 100ms off, 300ms on)
    vibrate: isMobileDevice ? [300, 100, 300] : undefined,
    // Garder la notification active plus longtemps sur mobile
    requireInteraction: isMobileDevice,
    data: {
      url: payload.data.url || '/chat',
      conversationId: payload.data.conversationId,
      timestamp: payload.data.timestamp || Date.now(),
      simulated: true,
      isMobileDevice: isMobileDevice
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ],
    vibrate: [100, 50, 100]
  };
  
  console.log('[SW DEBUG] Affichage notification simulée:', { notificationTitle, notificationOptions });
  return self.registration.showNotification(notificationTitle, notificationOptions);
}

/**
 * Fonction spécifique pour tester les notifications sur mobile
 * Cette fonction peut être appelée depuis l'application principale
 */
function testMobileNotification() {
  console.log('[SW MOBILE] Test de notification mobile initié');
  isMobileDevice = true; // Force le mode mobile
  
  const testPayload = {
    data: {
      title: 'Test Mobile Airhost',
      body: 'Cette notification est un test spécifique pour mobile',
      url: '/chat',
      conversationId: 'test-mobile-' + Date.now(),
      timestamp: Date.now(),
      isMobileDevice: true
    }
  };
  
  return simulateNotification(testPayload);
}

/**
 * Gestionnaire de messages entre le client et le service worker
 * Permet notamment de forcer le rafraîchissement des messages de chat
 */
self.addEventListener('message', (event) => {
  console.log('[SW MOBILE] Message reçu du client:', event.data);
  
  // Stocker la source du message pour pouvoir répondre directement à ce client
  const clientId = event.source ? event.source.id : null;
  if (clientId) {
    console.log(`[SW MOBILE] Message reçu du client ${clientId}`);
  }
  
  // Traitement des messages de type NEW_MESSAGE
  if (event.data && event.data.type === 'NEW_MESSAGE') {
    console.log('[SW MOBILE] Nouveau message de chat détecté, notification aux clients');
    
    // Notifier tous les clients (fenêtres ouvertes) pour rafraîchir leurs données
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'FORCE_REFRESH',
            payload: event.data.payload,
            timestamp: Date.now()
          });
          console.log('[SW MOBILE] Message de rafraîchissement envoyé au client:', client.id);
        });
      })
    );
    
    // Si c'est un appareil mobile, on peut aussi afficher une notification
    if (isMobileDevice || /mobile/i.test(navigator.userAgent || '')) {
      const payload = event.data.payload;
      simulateNotification({
        data: {
          title: 'Nouveau message',
          body: payload.content || 'Vous avez reçu un nouveau message',
          url: '/chat',
          conversationId: payload.conversation_id,
          timestamp: Date.now(),
          isMobileDevice: true
        }
      });
    }
  }
  
  // Traitement des messages de type TEST_MOBILE
  if (event.data && event.data.type === 'TEST_MOBILE') {
    console.log('[SW MOBILE] Test mobile demandé');
    testMobileNotification();
  }
});

