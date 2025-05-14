#!/bin/bash

# Script de déploiement vers l'environnement de recette
echo "Déploiement vers l'environnement de recette..."

# Aller dans le répertoire frontend
cd "$(dirname "$0")/frontend"

# Nettoyer les builds précédents
echo "Nettoyage des builds précédents..."
rm -rf dist

# Construire l'application
echo "Construction de l'application..."
npm run build

# Vérifier si la construction a réussi
if [ $? -ne 0 ]; then
  echo "Erreur lors de la construction de l'application."
  exit 1
fi

echo "Construction réussie !"

# Instructions pour le déploiement manuel
echo ""
echo "=== INSTRUCTIONS POUR LE DÉPLOIEMENT ==="
echo "1. Connectez-vous au dashboard Netlify"
echo "2. Allez dans le site de recette (airhost-rec)"
echo "3. Cliquez sur 'Deploys' puis 'Deploy manually'"
echo "4. Glissez-déposez le dossier 'frontend/dist' dans la zone indiquée"
echo "5. Assurez-vous que les variables d'environnement suivantes sont configurées :"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - OPENAI_API_KEY"
echo "   - OPENAI_ORG_ID (optionnel)"
echo "   - VITE_SITE_URL (doit être https://airhost-rec.netlify.app)"
echo ""
echo "Le dossier à déployer est : $(pwd)/dist"
echo ""

# Ouvrir le dossier dist dans Finder pour faciliter le glisser-déposer
open "$(pwd)/dist"

echo "Script terminé. Vous pouvez maintenant déployer manuellement le dossier dist vers Netlify."
