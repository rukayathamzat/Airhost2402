#!/bin/bash
# deploy-feature-to-netlify.sh - Script pour déployer une fonctionnalité directement sur Netlify
# Usage: ./deploy-feature-to-netlify.sh [nom-du-site-netlify]

# Vérifier si netlify-cli est installé
if ! command -v netlify &> /dev/null; then
  echo "❌ netlify-cli n'est pas installé"
  echo "💻 Installation avec : npm install -g netlify-cli"
  npm install -g netlify-cli
fi

# Nom du site Netlify par défaut (à remplacer par le vôtre)
default_site="airhost-app"
site_name=${1:-$default_site}

# Vérifier que nous sommes sur la branche deploy
current_branch=$(git symbolic-ref --short HEAD)
if [ "$current_branch" != "deploy" ]; then
  echo "⚠️ Vous n'êtes pas sur la branche deploy"
  echo "🔄 Passage à la branche deploy..."
  git checkout deploy || { echo "❌ Erreur lors du passage à deploy"; exit 1; }
fi

# Construire l'application
echo "🔨 Construction de l'application..."
cd frontend
npm install
npm run build

# Déployer sur Netlify
echo "🚀 Déploiement sur Netlify..."
netlify deploy --dir=dist --prod --site=$site_name

echo "✅ Déploiement terminé !"
echo "📅 Date de déploiement : $(date +"%Y-%m-%d %H:%M:%S")"
echo ""
echo "📋 N'oubliez pas de tester la nouvelle fonctionnalité d'analyse IA des messages !"
