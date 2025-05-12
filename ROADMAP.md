# Roadmap Airhost

## Historique des versions

### v1.2.3 - Messages Persistence (18/03/2025)
- ✅ Système de persistance locale des messages WhatsApp
- ✅ Intégration avec useMessagesRealtime pour combiner messages locaux et distants
- ✅ Correction de l'interface Message (ajout du champ conversation_id)
- ✅ Déduplication et tri chronologique des messages
- ✅ Mécanisme de nettoyage des messages anciens (>7 jours)

### v1.2.2 - Amélioration Webhook WhatsApp (15/03/2025)
- ✅ Mécanismes de fiabilité avec système de réessai
- ✅ Traitement parallèle des messages
- ✅ IDs uniques basés sur l'ID WhatsApp
- ✅ Recherche robuste des conversations
- ✅ Déclenchement Realtime renforcé
- ✅ Format standardisé pour les logs

### v1.2.1 - ChatWindow Realtime (10/03/2025)
- ✅ Architecture double (Realtime + Polling) 
- ✅ Interface utilisateur avec indicateurs d'état
- ✅ Traitement robuste avec déduplication
- ✅ Journalisation complète pour le débogage

## Fonctionnalités à venir

### v1.3.0 - Amélioration UI/UX (Planifiée)
- ⬜️ Refonte du design des conversations 
- ⬜️ Indicateurs de lecture pour les messages
- ⬜️ Notifications améliorées
- ⬜️ Mode sombre

### v1.4.0 - Intégration avancée (Planifiée)
- ⬜️ Intégration avec d'autres canaux de messagerie
- ⬜️ API pour systèmes externes
- ⬜️ Dashboard analytics
