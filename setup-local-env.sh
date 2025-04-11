#!/bin/bash
# Script pour configurer l'environnement local de test

# Créer le répertoire pour les fonctions Netlify s'il n'existe pas
mkdir -p frontend/netlify/functions

# Créer le fichier .env pour les fonctions Netlify
cat > frontend/netlify/functions/.env << EOL
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
SUPABASE_URL=YOUR_SUPABASE_URL_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
EOL

echo "Variables d'environnement configurées pour les fonctions Netlify"
echo "Pour lancer l'application en local avec les fonctions Netlify, exécutez :"
echo "cd frontend && netlify dev"
echo ""
echo "ATTENTION: Ce fichier contient des informations sensibles."
echo "N'oubliez pas de le supprimer après utilisation et de ne pas le committer dans Git."
echo ""
echo "Pour supprimer ce fichier après utilisation :"
echo "rm -f setup-local-env.sh"
