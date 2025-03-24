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
  appId: "1:107044522957:web:ad4e9a0c48dc18cd2bb18e"
};

// Initialisation de Firebase dans le Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

console.log('[SW DEBUG] Firebase initialisé dans le service worker');

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
  console.log('[SW DEBUG] Notification push reçue', event);

  if (!event.data) {
    console.log('[SW DEBUG] Aucune donnée reçue');
    return;
  }

  try {
    const data = event.data.json();
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

  event.notification.close();

  if (event.action === 'close') {
    console.log('[SW DEBUG] Action de fermeture, pas de navigation');
    return;
  }

  const urlToOpen = event.notification.data?.url || '/chat';
  const conversationId = event.notification.data?.conversationId;
  console.log('[SW DEBUG] Navigation vers:', { urlToOpen, conversationId });

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
  
  try {
    // Déterminer si c'est un message de données uniquement ou si contient une notification
    if (payload.data) {
      console.log('[SW DEBUG] Données FCM reçues:', payload.data);
      
      // Construire les options de notification à partir des données
      const notificationTitle = payload.data.title || payload.notification?.title || 'Airhost';
      const notificationOptions = {
        body: payload.data.body || payload.notification?.body || 'Nouveau message reçu',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          url: payload.data.url || '/chat',
          conversationId: payload.data.conversationId,
          timestamp: payload.data.timestamp || Date.now(),
          click_action: payload.data.click_action || 'FLUTTER_NOTIFICATION_CLICK'
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
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW DEBUG] Exécution de skipWaiting() suite à la demande');
    self.skipWaiting();
  }
});

// Gestion de la fermeture d'une notification
self.addEventListener('notificationclose', (event) => {
  console.log('[SW DEBUG] Notification fermée', event);
});
