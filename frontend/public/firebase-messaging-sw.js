// Service Worker FCM pour PWA - Gestion des notifications push
// Ce fichier doit être à la racine du dossier public pour fonctionner

// Import des scripts Firebase nécessaires
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

// Configuration Firebase - Uniquement données publiques
firebase.initializeApp({
  apiKey: "AIzaSyBVmT8MxmCnCL2RrHA5y5ftvHxcbkcj5Co",  // API key publique limitée aux notifications
  projectId: "airhost-d9c48",
  messagingSenderId: "107044522957",
  appId: "1:107044522957:web:ad4e9a0c48dc18cd2bb18e"
});

const messaging = firebase.messaging();

// Gestion des notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Personnalisation de la notification pour PWA
  const notificationTitle = payload.notification.title || 'Nouveau message';
  const notificationOptions = {
    body: payload.notification.body || 'Vous avez un nouveau message',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-96x96.png',
    data: payload.data,
    vibrate: [200, 100, 200],
    // Options spécifiques pour PWA
    tag: payload.data?.messageId || 'default', // Regroupe les notifications avec le même tag
    renotify: true, // Notifie l'utilisateur même si une notification avec le même tag existe déjà
    requireInteraction: true // La notification reste visible jusqu'à interaction de l'utilisateur
  };

  // Affichage de la notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gestion du clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.');

  const clickedNotification = event.notification;
  clickedNotification.close();

  // Définir l'URL à ouvrir lors du clic sur la notification
  let urlToOpen = self.location.origin;
  
  if (event.notification.data && event.notification.data.conversationId) {
    urlToOpen = `${self.location.origin}/conversation/${event.notification.data.conversationId}`;
  }

  // Ouvrir l'URL dans une fenêtre existante si possible
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Vérifier si une fenêtre est déjà ouverte
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Si aucune fenêtre n'est ouverte, en ouvrir une nouvelle
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
