#!/bin/bash
# deploy-to-production.sh - Script pour déployer de recette vers production
# Usage: ./deploy-to-production.sh [tag-version]

# Générer un tag par défaut basé sur la date et l'heure actuelles
default_tag="v$(date +%Y%m%d-%H%M)-deploy"
tag_version=${1:-$default_tag}

echo "🔍 Vérification de l'état du dépôt..."
git fetch origin

# Vérifier si la branche recette a des modifications non déployées en production
recette_commit=$(git rev-parse origin/recette)
main_commit=$(git rev-parse origin/main)

if [ "$recette_commit" == "$main_commit" ]; then
  echo "⚠️ La branche recette et la branche main sont déjà synchronisées."
  echo "   Aucun déploiement nécessaire."
  exit 0
fi

# Passer à recette et mettre à jour
echo "🔄 Passage à la branche recette..."
git checkout recette
git pull origin recette

# Passer à main et fusionner
echo "🔄 Passage à la branche main..."
git checkout main
git pull origin main

echo "🔀 Fusion de recette dans main..."
git merge recette || { 
  echo "⚠️ Conflit de fusion détecté."
  echo "📝 Résolvez les conflits, puis exécutez les commandes suivantes :"
  echo "git add ."
  echo "git commit -m \"Résolution des conflits pour le déploiement en production\""
  echo "git push origin main"
  echo "git tag $tag_version"
  echo "git push origin --tags"
  exit 1; 
}

# Pousser les changements
echo "📤 Envoi des modifications vers le dépôt distant..."
git push origin main

# Créer un tag pour cette version
echo "🏷️ Création du tag $tag_version..."
git tag $tag_version
git push origin --tags

echo "✅ Déploiement en production réussi !"
echo "🚀 Netlify devrait déployer automatiquement les changements"
echo ""
echo "📋 N'oubliez pas de vérifier que tout fonctionne correctement en production !"
echo "📅 Date de déploiement : $(date +"%Y-%m-%d %H:%M:%S")"
echo "🏷️ Version déployée : $tag_version"
