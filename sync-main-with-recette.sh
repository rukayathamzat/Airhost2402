#!/bin/bash
# sync-main-with-recette.sh - Script pour synchroniser main avec recette
# Ce script contourne le problème d'historiques non liés en créant une archive des fichiers de recette
# et en les poussant vers main en tant que nouveau commit

# Définir le tag pour cette version
tag_version="v$(date +%Y%m%d-%H%M)-sync-main-with-recette"

echo "🔄 Synchronisation de main avec recette..."

# S'assurer que nous sommes sur la branche recette et qu'elle est à jour
echo "📥 Mise à jour de la branche recette..."
git checkout recette
git pull origin recette

# Créer un répertoire temporaire pour l'archive
echo "📦 Création d'une archive des fichiers de recette..."
temp_dir="../airhost-temp-$(date +%Y%m%d%H%M%S)"
mkdir -p $temp_dir

# Copier tous les fichiers (sauf .git) vers le répertoire temporaire
echo "📋 Copie des fichiers..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.DS_Store' ./ $temp_dir/

# Passer à la branche main
echo "🔄 Passage à la branche main..."
git checkout main
git pull origin main

# Sauvegarder les fichiers importants de main qui pourraient ne pas être dans recette
echo "💾 Sauvegarde des fichiers importants de main..."
main_backup="../airhost-main-backup-$(date +%Y%m%d%H%M%S)"
mkdir -p $main_backup
# Ajoutez ici les fichiers spécifiques à main que vous voulez conserver

# Supprimer tous les fichiers de main (sauf .git)
echo "🗑️ Nettoyage de la branche main..."
find . -mindepth 1 -maxdepth 1 -not -path "./.git" -exec rm -rf {} \;

# Copier les fichiers de recette vers main
echo "📋 Copie des fichiers de recette vers main..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.DS_Store' $temp_dir/ ./

# Ajouter tous les fichiers au suivi Git
echo "➕ Ajout des fichiers au suivi Git..."
git add .

# Créer un commit
echo "💾 Création d'un commit..."
git commit -m "Synchronisation de main avec recette (contournement des historiques non liés)"

# Pousser les changements
echo "📤 Envoi des modifications vers le dépôt distant..."
git push origin main

# Créer un tag pour cette version
echo "🏷️ Création du tag $tag_version..."
git tag $tag_version
git push origin --tags

# Nettoyage
echo "🧹 Nettoyage..."
rm -rf $temp_dir

echo "✅ Synchronisation terminée ! La branche main est maintenant à jour avec recette."
echo "🚀 Netlify devrait déployer automatiquement les changements en production."
echo ""
echo "📋 N'oubliez pas de mettre à jour la base de données de production avec les changements de la base de données de recette."
echo "📅 Date de synchronisation : $(date +"%Y-%m-%d %H:%M:%S")"
echo "🏷️ Version déployée : $tag_version"
