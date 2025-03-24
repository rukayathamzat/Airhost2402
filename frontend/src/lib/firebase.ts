// Initialisation de Firebase et FCM pour PWA
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';

// Configuration Firebase initiale par défaut (sera remplacée par la configuration de l'Edge Function)
let firebaseConfig = {
  apiKey: '',
  authDomain: "airhost-d9c48.firebaseapp.com",
  projectId: "airhost-d9c48",
  storageBucket: "airhost-d9c48.appspot.com",
  messagingSenderId: "107044522957",
  appId: "1:107044522957:web:ad4e9a0c48dc18cd2bb18e"
};

// Fonction pour récupérer la configuration Firebase depuis l'Edge Function
async function loadFirebaseConfig() {
  try {
    const response = await fetch('https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/fcm-proxy/config', {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      }
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération de la configuration: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.config && data.config.apiKey) {
      console.log('[FIREBASE DEBUG] Configuration récupérée depuis l\'Edge Function');
      firebaseConfig = data.config;
    } else {
      console.error('[FIREBASE DEBUG] Configuration invalide reçue de l\'Edge Function');
    }
  } catch (error) {
    console.error('[FIREBASE DEBUG] Impossible de récupérer la configuration:', error);
  }
  
  return firebaseConfig;
}

// Initialisation de l'application Firebase
let firebaseApp: any;
let messaging: Messaging | null = null;
let initialized = false;

// Fonction pour initialiser Firebase après avoir chargé la configuration
async function initializeFirebase() {
  if (initialized) return;
  
  // Charger la configuration depuis l'Edge Function
  const config = await loadFirebaseConfig();
  console.log('[FIREBASE DEBUG] Configuration Firebase utilisée:', JSON.stringify(config));

  try {
    console.log('[FIREBASE DEBUG] Initialisation de Firebase avec config:', config);
    firebaseApp = initializeApp(config);
    console.log('[FIREBASE DEBUG] Firebase App initialisé avec succès');
    
    messaging = getMessaging(firebaseApp);
    console.log('[FIREBASE DEBUG] Firebase Messaging initialisé avec succès');
    initialized = true;
  } catch (error) {
    console.error('[FIREBASE DEBUG] Erreur lors de l\'initialisation de Firebase:', error);
    // Ne pas initialiser par défaut en cas d'erreur, car cela pourrait provoquer d'autres erreurs
  }
}

// Objet pour stocker la fonction de callback des messages FCM
let messagingCallback: ((payload: MessagePayload) => void) | null = null;

/**
 * Récupère le token FCM après avoir demandé la permission
 * @returns {Promise<string|null>} Le token FCM ou null si la permission est refusée
 */
export const requestFCMPermission = async (): Promise<string | null> => {
  console.log('[FIREBASE] Demande de permission de notification...');
  
  try {
    // S'assurer que Firebase est initialisé
    if (!initialized) {
      await initializeFirebase();
    }
    
    // Vérifier que le service worker et la messagerie sont disponibles
    if (!('serviceWorker' in navigator)) {
      console.warn('[FIREBASE] Les service workers ne sont pas pris en charge par ce navigateur');
      return null;
    }
    
    // Vérifier l'accès à la messagerie Firebase
    if (!messaging) {
      console.warn('[FIREBASE] Firebase Messaging n\'est pas disponible');
      return null;
    }
    
    // Vérifier qu'on est sur HTTPS (nécessaire pour les notifications)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.warn('[FIREBASE] Les notifications push nécessitent HTTPS');
      return null;
    }

    // S'assurer que le service worker est enregistré
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('[FIREBASE] Service Worker enregistré avec succès', registration);
    
    // Demander la permission de notification
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('[FIREBASE] Permission de notification refusée');
      return null;
    }
    
    console.log('[FIREBASE] Permission de notification accordée');
    
    // Récupérer le token FCM
    console.log('[FIREBASE DEBUG] Tentative d\'obtention du token FCM...');
    try {
      const fcmToken = await getToken(messaging, {
        vapidKey: 'BCeZrB7xYF6LkY0vq4NEG3AZaHaKHn2RrzzM5WYtBsQpdYkLQs0tkjx-hcN6XlmNNPt4cKpbLJEi6TP_Qqt7Jck', // Clé VAPID publique
        serviceWorkerRegistration: registration
      });
      
      if (fcmToken) {
        console.log('[FIREBASE DEBUG] Token FCM obtenu avec succès:', fcmToken);
        
        // Notification simple au service worker que nous avons un token
        try {
          if (registration.active) {
            registration.active.postMessage({
              type: 'FCM_TOKEN_RECEIVED',
              token: fcmToken
            });
            console.log('[FIREBASE] Token envoyé au service worker');
          }
        } catch (swError) {
          console.error('[FIREBASE] Erreur de communication avec le service worker:', swError);
        }
        
        return fcmToken;
      } else {
        console.warn('[FIREBASE DEBUG] Token FCM null ou vide');
        return null;
      }
    } catch (tokenError) {
      console.error('[FIREBASE DEBUG] Erreur lors de l\'obtention du token:', tokenError);
      return null;
    }
  } catch (error) {
    console.error('[FIREBASE] Erreur lors de la demande de permission:', error);
    return null;
  }
};

/**
 * Configure la fonction de callback pour les messages FCM reçus au premier plan
 * @param callback - Fonction à appeler lorsqu'un message est reçu
 */
export const setMessagingCallback = (callback: (payload: MessagePayload) => void): void => {
  messagingCallback = callback;

  // Vérifier si messaging est initialisé
  if (!messaging) {
    console.warn('[FIREBASE] Impossible de configurer le callback: messaging non initialisé');
    // Tenter d'initialiser Firebase et réessayer ensuite
    initializeFirebase().then(() => {
      if (messaging) {
        setupMessageHandler();
      } else {
        console.error('[FIREBASE] Échec de l\'initialisation de Firebase Messaging');
      }
    });
    return;
  }
  
  setupMessageHandler();
};

// Fonction interne pour configurer le gestionnaire de messages
function setupMessageHandler(): void {
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('[FIREBASE] Message reçu au premier plan:', payload);
    
    // Appeler le callback avec le payload
    if (messagingCallback) {
      messagingCallback(payload);
    }
    
    // Afficher une notification si l'application est au premier plan
    // Pas nécessaire sur Android, car le service worker s'en charge
    if (Notification.permission === 'granted' && !navigator.userAgent.toLowerCase().includes('android')) {
      const notificationTitle = payload.notification?.title || 'Nouveau message';
      const notificationOptions = {
        body: payload.notification?.body || 'Vous avez un nouveau message',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        data: payload.data
      };
      
      new Notification(notificationTitle, notificationOptions);
    }
  });
};

interface FirebaseMessagingInterface {
  messaging: Messaging | null;
  requestFCMPermission: typeof requestFCMPermission;
  setMessagingCallback: typeof setMessagingCallback;
}

/**
 * Fonction de test pour les notifications Firebase
 * Peut être appelée directement depuis la console du navigateur
 */
export const testFirebaseNotification = async () => {
  try {
    console.log('[FIREBASE TEST] Début du test de notifications...');
    
    // 1. Vérifier l'état des permissions
    console.log('[FIREBASE TEST] Permission actuelle:', Notification.permission);
    
    // 2. Demander la permission si nécessaire
    if (Notification.permission !== 'granted') {
      console.log('[FIREBASE TEST] Demande de permission...');
      const newPermission = await Notification.requestPermission();
      console.log('[FIREBASE TEST] Nouvelle permission:', newPermission);
      
      if (newPermission !== 'granted') {
        console.error('[FIREBASE TEST] Permission refusée, impossible de continuer le test');
        return false;
      }
    }
    
    // 3. Afficher une notification de test web simple
    console.log('[FIREBASE TEST] Affichage d\'une notification web simple...');
    new Notification('Test de notification', {
      body: 'Ceci est un test de notification web simple',
      icon: '/icons/icon-192x192.png'
    });
    
    // 4. Essayer d'obtenir un token FCM
    const token = await requestFCMPermission();
    console.log('[FIREBASE TEST] Token FCM obtenu:', token);

    if (token) {
      // 5. Envoyer une notification de test via l'Edge Function
      console.log('[FIREBASE TEST] Envoi d\'une notification via l\'Edge Function...');
      const response = await fetch('https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/fcm-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: 'Test de notification FCM',
            body: 'Ceci est un test de notification via l\'Edge Function'
          },
          data: {
            type: 'test',
            title: 'Test pour mobile', // Titre de fallback pour mobile
            body: 'Ce message devrait apparaître sur mobile', // Texte de fallback pour mobile
            timestamp: new Date().toISOString(),
            click_action: 'FLUTTER_NOTIFICATION_CLICK' // Important pour Android
          },
          // Paramètres spécifiques à Android
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              click_action: 'FLUTTER_NOTIFICATION_CLICK'
            }
          },
          // Paramètres spécifiques à iOS/Apple
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                content_available: true
              }
            }
          }
        })
      });

      const result = await response.json();
      console.log('[FIREBASE TEST] Résultat de l\'envoi:', result);
    }
    
    // 6. Exposer aux variables globales pour accès facile
    // @ts-ignore
    window.testFirebaseNotification = testFirebaseNotification;
    // @ts-ignore
    window.firebaseMessaging = firebaseMessaging;
    
    return true;
  } catch (error) {
    console.error('[FIREBASE TEST] Erreur lors du test de notification:', error);
    return false;
  }
};

// Exposer la fonction de test globalement
// @ts-ignore
window.testFirebaseNotification = testFirebaseNotification;

const firebaseMessaging: FirebaseMessagingInterface = {
  messaging: messaging,
  requestFCMPermission,
  setMessagingCallback
};

export default firebaseMessaging;
