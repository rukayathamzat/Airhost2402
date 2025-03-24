// Initialisation de Firebase et FCM pour PWA
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';

/**
 * Service de notification Firebase avec pattern singleton et promesse d'initialisation
 * Garantit une séquence d'initialisation robuste et évite les problèmes d'accès anticipé
 */
class FirebaseNotificationService {
  private static instance: FirebaseNotificationService;
  private firebaseApp: any = null;
  private messagingInstance: Messaging | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;
  private messagingCallback: ((payload: MessagePayload) => void) | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  // Configuration Firebase par défaut (sera remplacée par la configuration de l'Edge Function)
  private firebaseConfig = {
    apiKey: '',
    authDomain: "airhost-d9c48.firebaseapp.com",
    projectId: "airhost-supabase", // ID correct du projet selon la console Firebase
    storageBucket: "airhost-d9c48.appspot.com",
    messagingSenderId: "107044522957",
    appId: "1:107044522957:web:ad4e9a0c48dc18cd2bb18e"
  };

  private constructor() {
    // Constructeur privé pour garantir le singleton
  }

  /**
   * Récupère l'instance singleton du service de notification
   */
  public static getInstance(): FirebaseNotificationService {
    if (!FirebaseNotificationService.instance) {
      FirebaseNotificationService.instance = new FirebaseNotificationService();
    }
    return FirebaseNotificationService.instance;
  }

  /**
   * Récupère la configuration Firebase depuis l'Edge Function
   */
  private async loadFirebaseConfig(): Promise<any> {
    try {
      console.log('[FIREBASE DEBUG] Récupération de la configuration Firebase depuis l\'Edge Function...');
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
        
        // CORRECTION: S'assurer que le projectId est "airhost-supabase" (valeur correcte selon la console Firebase)
        this.firebaseConfig = {
          ...data.config,
          projectId: "airhost-supabase" // Forcer la valeur correcte, quelle que soit celle renvoyée par l'Edge Function
        };
        
        console.log('[FIREBASE DEBUG] ProjectId forcé à "airhost-supabase" pour correspondre au projet Firebase réel');
      } else {
        console.error('[FIREBASE DEBUG] Configuration invalide reçue de l\'Edge Function');
      }
    } catch (error) {
      console.error('[FIREBASE DEBUG] Impossible de récupérer la configuration:', error);
    }
    
    return this.firebaseConfig;
  }
  
  /**
   * Initialise Firebase de manière asynchrone
   * Retourne une promesse pour garantir la séquence d'initialisation
   */
  public initialize(): Promise<boolean> {
    // Si déjà initialisé, retourner immédiatement le résultat précédent
    if (this.isInitialized) {
      return Promise.resolve(true);
    }
    
    // Si l'initialisation est en cours, retourner la promesse existante
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Créer une nouvelle promesse d'initialisation
    this.initPromise = new Promise<boolean>(async (resolve) => {
      try {
        // Étape 1: Charger la configuration Firebase
        const config = await this.loadFirebaseConfig();
        console.log('[FIREBASE DEBUG] Configuration Firebase utilisée:', JSON.stringify(config));
        
        // Étape 2: Initialiser l'application Firebase
        console.log('[FIREBASE DEBUG] Initialisation de Firebase...');
        this.firebaseApp = initializeApp(config);
        console.log('[FIREBASE DEBUG] Firebase App initialisé avec succès');
        
        // Étape 3: Initialiser le service de messagerie
        this.messagingInstance = getMessaging(this.firebaseApp);
        console.log('[FIREBASE DEBUG] Firebase Messaging initialisé avec succès');
        
        // Étape 4: Marquer comme initialisé
        this.isInitialized = true;
        resolve(true);
      } catch (error) {
        console.error('[FIREBASE DEBUG] Erreur lors de l\'initialisation de Firebase:', error);
        this.isInitialized = false;
        this.initPromise = null;
        resolve(false);
      }
    });
    
    return this.initPromise;
  }
  
  /**
   * Enregistre le service worker pour les notifications
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (this.serviceWorkerRegistration) {
      return this.serviceWorkerRegistration;
    }
    
    try {
      // Vérifier si les services workers sont supportés
      if (!('serviceWorker' in navigator)) {
        console.warn('[FIREBASE] Les service workers ne sont pas pris en charge par ce navigateur');
        return null;
      }

      // Vérifier si on est sur HTTPS (nécessaire pour les notifications)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('[FIREBASE] Les notifications push nécessitent HTTPS');
        return null;
      }

      // Récupérer l'enregistrement existant ou en créer un nouveau
      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        console.log('[FIREBASE] Aucun service worker enregistré, tentative d\'enregistrement...');
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('[FIREBASE] Service Worker enregistré avec succès', registration);
      } else {
        console.log('[FIREBASE] Service Worker existant utilisé:', registration);
      }
      
      this.serviceWorkerRegistration = registration;
      return registration;
    } catch (error) {
      console.error('[FIREBASE] Erreur lors de l\'enregistrement du service worker:', error);
      return null;
    }
  }
  
  /**
   * Demande la permission et obtient un token FCM
   */
  public async requestFCMPermission(): Promise<string | null> {
    console.log('[FIREBASE] Demande de permission de notification...');
    
    try {
      // Vérifier que Firebase est initialisé
      await this.initialize();
      
      if (!this.isInitialized || !this.messagingInstance) {
        console.error('[FIREBASE] Firebase Messaging n\'est pas initialisé');
        return null;
      }
      
      // Enregistrer le service worker
      const registration = await this.registerServiceWorker();
      if (!registration) {
        return null;
      }
      
      // Demander la permission de notification
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[FIREBASE] Permission de notification refusée');
        return null;
      }
      
      console.log('[FIREBASE] Permission de notification accordée');
      
      // Obtenir le token FCM
      try {
        const fcmToken = await getToken(this.messagingInstance, {
          vapidKey: 'BCeZrB7xYF6LkY0vq4NEG3AZaHaKHn2RrzzM5WYtBsQpdYkLQs0tkjx-hcN6XlmNNPt4cKpbLJEi6TP_Qqt7Jck',
          serviceWorkerRegistration: registration
        });
        
        if (fcmToken) {
          console.log('[FIREBASE DEBUG] Token FCM obtenu avec succès:', fcmToken);
          
          // Notification au service worker que nous avons un token
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
      console.error('[FIREBASE] Erreur dans requestFCMPermission:', error);
      return null;
    }
  }
  
  /**
   * Configure la fonction de callback pour les messages FCM reçus
   */
  public setMessagingCallback(callback: (payload: MessagePayload) => void): void {
    this.messagingCallback = callback;
    
    // Si messaging n'est pas encore initialisé, l'initialiser
    if (!this.isInitialized || !this.messagingInstance) {
      console.warn('[FIREBASE] Configuration du callback reportée: messaging non initialisé');
      // Initialiser Firebase et configurer le gestionnaire après
      this.initialize().then((success) => {
        if (success && this.messagingInstance) {
          this.setupMessageHandler();
        } else {
          console.error('[FIREBASE] Échec de l\'initialisation de Firebase Messaging');
        }
      });
      return;
    }
    
    // Si déjà initialisé, configurer immédiatement le gestionnaire
    this.setupMessageHandler();
  }
  
  /**
   * Fonction interne pour configurer le gestionnaire de messages
   */
  private setupMessageHandler(): void {
    if (!this.messagingInstance || !this.messagingCallback) {
      console.warn('[FIREBASE] Impossible de configurer le gestionnaire de messages: messaging ou callback non défini');
      return;
    }
    
    // Configurer le gestionnaire de messages pour les messages reçus en premier plan
    console.log('[FIREBASE] Configuration du gestionnaire de messages...');
    
    try {
      onMessage(this.messagingInstance, (payload) => {
        console.log('[FIREBASE] Message FCM reçu au premier plan:', payload);
        
        // Appeler la fonction de callback avec le payload du message
        if (this.messagingCallback) {
          this.messagingCallback(payload);
        }
      });
      
      console.log('[FIREBASE] Gestionnaire de messages configuré avec succès');
    } catch (error) {
      console.error('[FIREBASE] Erreur lors de la configuration du gestionnaire de messages:', error);
    }
  }
  
  /**
   * Teste l'envoi d'une notification Firebase (utile pour le débogage)
   */
  public async testNotification(): Promise<boolean> {
    console.log('[FIREBASE] Test de notification initié');
    
    try {
      // Vérifier que Firebase est initialisé
      await this.initialize();
      
      if (!this.isInitialized) {
        console.error('[FIREBASE] Test de notification impossible: Firebase non initialisé');
        return false;
      }
      
      // Créer une notification de test
      const notification = new Notification('Test de notification Firebase', {
        body: 'Cette notification est un test de Firebase Messaging',
        icon: '/favicon.ico'
      });
      
      // Ajouter un gestionnaire de clic pour la notification de test
      notification.onclick = () => {
        console.log('[FIREBASE] Notification de test cliquée');
        notification.close();
        window.focus();
      };
      
      console.log('[FIREBASE] Notification de test envoyée avec succès');
      return true;
    } catch (error) {
      console.error('[FIREBASE] Erreur lors du test de notification:', error);
      return false;
    }
  }
}

// Instance singleton du service de notification
const firebaseNotificationService = FirebaseNotificationService.getInstance();

// Fonctions exportées pour la compatibilité avec le code existant

/**
 * Récupère le token FCM après avoir demandé la permission
 * @returns {Promise<string|null>} Le token FCM ou null si la permission est refusée
 */
export const requestFCMPermission = async (): Promise<string | null> => {
  console.log('[FIREBASE] Délégation au service de notification Firebase...');
  return await firebaseNotificationService.requestFCMPermission();
};



/**
 * Configure la fonction de callback pour les messages FCM reçus au premier plan
 * @param callback - Fonction à appeler lorsqu'un message est reçu
 */
export const setMessagingCallback = (callback: (payload: MessagePayload) => void): void => {
  console.log('[FIREBASE] Délégation du callback au service de notification Firebase...');
  firebaseNotificationService.setMessagingCallback(callback);
};



/**
 * Interface qui expose les fonctionnalités de Firebase Messaging
 */
interface FirebaseMessagingInterface {
  // Service singleton de Firebase Messaging
  notificationService: typeof firebaseNotificationService;
  // Méthodes exposées pour la compatibilité avec le code existant
  requestFCMPermission: typeof requestFCMPermission;
  setMessagingCallback: typeof setMessagingCallback;
  testFirebaseNotification: typeof testFirebaseNotification;
}

/**
 * Fonction de test pour les notifications Firebase
 * Peut être appelée directement depuis la console du navigateur
 */
export const testFirebaseNotification = async () => {
  console.log('[FIREBASE TEST] Délégation du test au service de notification Firebase...');
  return await firebaseNotificationService.testNotification();
};

/**
 * Fonction de test spécifique pour simuler les notifications mobiles sur desktop
 * Peut être appelée directement depuis la console du navigateur
 */
export const testMobileNotification = async () => {
  try {
    console.log('[FIREBASE TEST] Début du test de notifications format mobile...');
    
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
    
    // 3. Essayer d'obtenir un token FCM
    const token = await requestFCMPermission();
    console.log('[FIREBASE TEST] Token FCM obtenu:', token);

    if (token) {
      // 4. Envoyer une notification au format mobile via l'Edge Function
      console.log('[FIREBASE TEST] Envoi d\'une notification format mobile...');
      const response = await fetch('https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/fcm-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: token,
          // Format spécifique mobile : uniquement data, pas de notification
          data: {
            title: 'Test format mobile',
            body: 'Ceci est un test de notification au format mobile',
            type: 'test-mobile',
            timestamp: new Date().toISOString(),
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          // Paramètres spécifiques à Android
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              click_action: 'FLUTTER_NOTIFICATION_CLICK'
            }
          }
        })
      });

      const result = await response.json();
      console.log('[FIREBASE TEST] Résultat de l\'envoi format mobile:', result);
      
      // 5. Tester aussi le format hybride (notification + data)
      console.log('[FIREBASE TEST] Envoi d\'une notification hybride...');
      const hybridResponse = await fetch('https://pnbfsiicxhckptlgtjoj.supabase.co/functions/v1/fcm-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: 'Test hybride',
            body: 'Notification avec format hybride'
          },
          data: {
            title: 'Test hybride (data)',
            body: 'Version data de la notification hybride',
            type: 'test-hybrid',
            timestamp: new Date().toISOString()
          }
        })
      });

      const hybridResult = await hybridResponse.json();
      console.log('[FIREBASE TEST] Résultat de l\'envoi hybride:', hybridResult);
    }
    
    // 6. Exposer aux variables globales pour accès facile
    // @ts-ignore
    window.testMobileNotification = testMobileNotification;
    
    return true;
  } catch (error) {
    console.error('[FIREBASE TEST] Erreur lors du test de notification mobile:', error);
    return false;
  }
};

// Exposer la fonction de test globalement
// @ts-ignore
window.testMobileNotification = testMobileNotification;

/**
 * Objet principal exporté avec l'API Firebase Messaging
 */
const firebaseMessaging: FirebaseMessagingInterface = {
  notificationService: firebaseNotificationService,
  requestFCMPermission,
  setMessagingCallback,
  testFirebaseNotification
};

export default firebaseMessaging;
