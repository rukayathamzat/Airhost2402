// Service Worker pour les notifications push
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

// Gestion des notifications push
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
