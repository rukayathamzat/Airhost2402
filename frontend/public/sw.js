// Service Worker pour les notifications push
self.addEventListener('install', (event) => {
  console.log('Service Worker installé');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activé');
  return self.clients.claim();
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('Notification push reçue', event);

  if (!event.data) {
    console.log('Aucune donnée reçue');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Données de notification reçues:', data);

    const options = {
      body: data.body || 'Nouveau message reçu',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
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

    event.waitUntil(
      self.registration.showNotification(data.title || 'Airhost', options)
    );
  } catch (error) {
    console.error('Erreur lors du traitement de la notification push:', error);
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Clic sur la notification', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/chat';
  const conversationId = event.notification.data?.conversationId;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Vérifier si une fenêtre est déjà ouverte et la focaliser
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Sinon, ouvrir une nouvelle fenêtre
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Gestion des messages entre le service worker et l'application
self.addEventListener('message', (event) => {
  console.log('Message reçu dans le service worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
