# AirHost - Gestionnaire de conversations WhatsApp pour hôtes Airbnb

Application de gestion et d'automatisation des conversations WhatsApp pour les hôtes Airbnb.

## Roadmap

### Phase 1 : Base de l'application ✅
- [x] Configuration du projet React/Vite
- [x] Mise en place de l'authentification avec Supabase
- [x] Création du schéma de base de données
- [x] Interface de chat basique
- [x] Affichage des conversations

### Phase 2 : Intégration WhatsApp 🚧
- [ ] Configuration de l'application Meta Business
- [ ] Mise en place des webhooks WhatsApp
- [ ] Gestion des templates de messages
- [ ] Respect de la fenêtre de 24h
- [ ] Journalisation des interactions

### Phase 3 : Automatisation 📅
- [ ] Intégration de l'IA pour les réponses
- [ ] Messages automatiques de check-in/out
- [ ] Détection des intentions
- [ ] Suggestions de réponses

### Phase 4 : Fonctionnalités avancées 🔮
- [ ] Dashboard analytique
- [ ] Gestion multi-propriétés
- [ ] Application mobile
- [ ] Intégration du calendrier
- [ ] Notifications push

## Structure du projet

```
/frontend/          # Application React
├── src/
│   ├── components/ # Composants React
│   ├── pages/      # Pages de l'application
│   ├── lib/        # Utilitaires et configuration
│   └── styles/     # Styles CSS
│
/infra/             # Infrastructure
├── migrations/     # Migrations Supabase
└── functions/      # Edge Functions
```

## Prérequis

- Node.js >= 18
- Compte Supabase
- Compte Meta Business
- Application WhatsApp Cloud API

## Stack technique

- Frontend : React, TypeScript, Material-UI
- Backend : Supabase (PostgreSQL, Auth, Edge Functions)
- API : WhatsApp Cloud API
- Déploiement : Vercel

## Développement

1. Cloner le repository
2. Installer les dépendances : `npm install`
3. Copier `.env.example` vers `.env`
4. Configurer les variables d'environnement
5. Lancer l'application : `npm run dev`

## Licence

Propriétaire - Tous droits réservés
