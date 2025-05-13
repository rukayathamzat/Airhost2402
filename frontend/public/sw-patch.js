// Script de correction pour le service worker
// Ce script intercepte les messages envoyés au service worker et filtre les notifications pour les messages sortants
// Il modifie également le service worker pour ajouter la vérification manquante dans le gestionnaire de messages NEW_MESSAGE

(function() {
  console.log('[SW-PATCH] Initialisation du patch pour le service worker...');
  
  // Fonction pour vérifier si un message est sortant
  function isOutboundMessage(payload) {
    return payload && (
      payload.direction === 'outbound' || 
      payload.isOutbound === true || 
      payload.isOutbound === 'true' ||
      (payload.sender && payload.sender.id === localStorage.getItem('currentUserId'))
    );
  }
  
  // Fonction pour patcher le service worker au niveau de l'application
  function patchServiceWorkerClient() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      console.log('[SW-PATCH] Aucun service worker actif, le patch client sera appliqué lorsqu\'un service worker sera enregistré');
      return false;
    }
    
    console.log('[SW-PATCH] Service worker actif, application du patch client...');
    
    // Sauvegarder la fonction originale
    const originalPostMessage = navigator.serviceWorker.controller.postMessage;
    
    // Remplacer la fonction par notre version patchée
    navigator.serviceWorker.controller.postMessage = function(message) {
      // Intercepter les messages de type NEW_MESSAGE
      if (message && message.type === 'NEW_MESSAGE') {
        console.log('[SW-PATCH] Message intercepté:', message);
        
        // Vérifier si c'est un message sortant
        if (isOutboundMessage(message.payload)) {
          console.log('[SW-PATCH] Message sortant détecté, filtrage de la notification');
          console.log('[SW-PATCH] Payload:', message.payload);
          
          // Ne pas envoyer le message au service worker pour éviter la notification
          return;
        }
      }
      
      // Pour tous les autres messages, utiliser la fonction originale
      return originalPostMessage.apply(this, arguments);
    };
    
    console.log('[SW-PATCH] Patch client appliqué avec succès');
    return true;
  }
  
  // Fonction pour patcher le service worker lui-même
  async function patchServiceWorkerCode() {
    console.log('[SW-PATCH] Tentative de modification du service worker...');
    
    try {
      // Récupérer l'enregistrement du service worker
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration || !registration.active) {
        console.error('[SW-PATCH] Aucun service worker actif trouvé');
        return false;
      }
      
      // Envoyer un message au service worker pour ajouter la vérification manquante
      registration.active.postMessage({
        type: 'PATCH_SERVICE_WORKER',
        patchFunction: `
          // Fonction pour vérifier si un message est sortant
          self.isOutboundMessage = function(payload) {
            return payload && (
              payload.direction === 'outbound' || 
              payload.isOutbound === true || 
              payload.isOutbound === 'true'
            );
          };
          
          // Sauvegarder les gestionnaires d'événements originaux
          const originalEventListeners = self.listeners('message');
          
          // Supprimer tous les gestionnaires d'événements existants
          originalEventListeners.forEach(listener => {
            self.removeEventListener('message', listener);
          });
          
          // Ajouter notre gestionnaire d'événements personnalisé
          self.addEventListener('message', function(event) {
            // Intercepter les messages de type NEW_MESSAGE
            if (event.data && event.data.type === 'NEW_MESSAGE') {
              console.log('[SW-PATCH-WORKER] Message intercepté:', event.data);
              
              // Vérifier si c'est un message sortant
              if (self.isOutboundMessage(event.data.payload)) {
                console.log('[SW-PATCH-WORKER] Message sortant détecté, filtrage de la notification');
                return; // Ne pas traiter ce message
              }
            }
            
            // Pour tous les autres messages, appeler les gestionnaires originaux
            originalEventListeners.forEach(listener => {
              listener(event);
            });
          });
          
          console.log('[SW-PATCH-WORKER] Patch appliqué avec succès au service worker');
        `
      });
      
      console.log('[SW-PATCH] Message de patch envoyé au service worker');
      return true;
    } catch (error) {
      console.error('[SW-PATCH] Erreur lors de la modification du service worker:', error);
      return false;
    }
  }
  
  // Fonction pour forcer l'activation d'un nouveau service worker
  async function forceActivateServiceWorker() {
    console.log('[SW-PATCH] Tentative de forcer l\'activation du service worker...');
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.error('[SW-PATCH] Aucun service worker enregistré');
        return false;
      }
      
      if (registration.waiting) {
        console.log('[SW-PATCH] Service worker en attente trouvé, forçage de l\'activation...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }
      
      console.log('[SW-PATCH] Aucun service worker en attente trouvé');
      return false;
    } catch (error) {
      console.error('[SW-PATCH] Erreur lors du forçage de l\'activation du service worker:', error);
      return false;
    }
  }
  
  // Fonction principale pour appliquer tous les patches
  async function applyAllPatches() {
    // Patcher le client en premier
    const clientPatched = patchServiceWorkerClient();
    
    // Patcher le service worker lui-même
    const workerPatched = await patchServiceWorkerCode();
    
    // Forcer l'activation du service worker si nécessaire
    await forceActivateServiceWorker();
    
    console.log('[SW-PATCH] Statut des patches:', {
      client: clientPatched,
      worker: workerPatched
    });
    
    // Ajouter un gestionnaire pour les changements de service worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW-PATCH] Changement de service worker détecté, réapplication des patches...');
      patchServiceWorkerClient();
    });
  }
  
  // Appliquer les patches immédiatement si possible
  if (navigator.serviceWorker.controller) {
    applyAllPatches();
  } else {
    // Sinon, attendre l'enregistrement d'un service worker
    console.log('[SW-PATCH] En attente de l\'enregistrement d\'un service worker...');
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW-PATCH] Service worker enregistré, application des patches...');
      applyAllPatches();
    });
  }
  
  console.log('[SW-PATCH] Initialisation terminée');
})();
