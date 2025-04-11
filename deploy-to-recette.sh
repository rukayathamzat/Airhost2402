#!/bin/bash
# deploy-to-recette.sh - Script pour déployer une fonctionnalité sur l'environnement de recette
# Usage: ./deploy-to-recette.sh feature/nom-de-la-fonctionnalite

if [ -z "$1" ]; then
  echo "Usage: ./deploy-to-recette.sh feature/nom-de-la-fonctionnalite"
  exit 1
fi

feature_branch=$1

# Vérifier que la branche existe
if ! git show-ref --verify --quiet refs/heads/$feature_branch; then
  echo "❌ La branche $feature_branch n'existe pas"
  exit 1
fi

# Vérifier que nous sommes sur la bonne branche
current_branch=$(git symbolic-ref --short HEAD)
if [ "$current_branch" != "$feature_branch" ]; then
  echo "ℹ️ Vous n'êtes pas sur la branche $feature_branch"
  echo "🔄 Passage à la branche $feature_branch..."
  git checkout $feature_branch || { echo "❌ Erreur lors du passage à $feature_branch"; exit 1; }
fi

# Mettre à jour la branche de fonctionnalité
echo "📥 Mise à jour de la branche $feature_branch..."
git pull origin $feature_branch

# Passer à recette et fusionner
echo "🔄 Passage à la branche recette..."
git checkout recette
git pull origin recette

echo "🔀 Fusion de $feature_branch dans recette..."
git merge $feature_branch || { 
  echo "⚠️ Conflit de fusion détecté."
  echo "📝 Résolvez les conflits, puis exécutez les commandes suivantes :"
  echo "git add ."
  echo "git commit -m \"Résolution des conflits pour la fusion de $feature_branch\""
  echo "git push origin recette"
  exit 1; 
}

# Pousser les changements
echo "📤 Envoi des modifications vers le dépôt distant..."
git push origin recette

echo "✅ La fonctionnalité $feature_branch a été déployée avec succès sur recette"
echo "🚀 Netlify devrait déployer automatiquement les changements"
echo ""
echo "📋 N'oubliez pas de tester soigneusement sur l'environnement de recette !"
echo "📅 Date de déploiement : $(date +"%Y-%m-%d %H:%M:%S")"
