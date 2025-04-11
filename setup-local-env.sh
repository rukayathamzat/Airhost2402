#!/bin/bash
# Script pour configurer l'environnement local de test

# Créer le répertoire pour les fonctions Netlify s'il n'existe pas
mkdir -p frontend/netlify/functions

# Créer le fichier .env pour les fonctions Netlify
cat > frontend/netlify/functions/.env << EOL
OPENAI_API_KEY=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
SUPABASE_URL=https://pnbfsiicxhckptlgtjoj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYmZzaWljeGhja3B0bGd0am9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDgzNzA2NywiZXhwIjoyMDU2NDEzMDY3fQ.Snct1D2wbllFqQIdcEnlaTFBF1THo9KLfiBzdlUkR1E
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
