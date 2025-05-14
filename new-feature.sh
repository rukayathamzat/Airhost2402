#!/bin/bash
# new-feature.sh - Script pour créer une nouvelle branche de fonctionnalité
# Usage: ./new-feature.sh nom-de-la-fonctionnalite

if [ -z "$1" ]; then
  echo "Usage: ./new-feature.sh nom-de-la-fonctionnalite"
  exit 1
fi

feature_name=$1
feature_branch="feature/$feature_name"
current_date=$(date +%Y%m%d)

# Mettre à jour la branche recette
echo "📥 Mise à jour de la branche recette..."
git checkout recette
git pull origin recette

# Créer la nouvelle branche de fonctionnalité
echo "🌱 Création de la branche $feature_branch..."
git checkout -b $feature_branch

echo "✅ Branche $feature_branch créée avec succès à partir de recette"
echo ""
echo "🚀 Pour pousser cette branche et obtenir un déploiement de prévisualisation :"
echo "git push origin $feature_branch"
echo ""
echo "📝 Bon développement !"
