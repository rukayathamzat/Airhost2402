#!/bin/bash

# Configuration
SUPABASE_URL="https://tornfqtvnzkgnwfudxdb.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/create-conversation"

echo "=== Test de l'Edge Function create-conversation ==="
echo ""

# Identifiants de connexion (prédéfinis pour faciliter le test)
EMAIL="sipoxot832@egvoo.com"
PASSWORD="Airhost123;"

# Obtenir un token JWT
echo "Obtention du token JWT..."
TOKEN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

# Extraire le token et l'ID utilisateur
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $TOKEN_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Erreur d'authentification. Vérifiez vos identifiants."
  echo "Réponse complète: $TOKEN_RESPONSE"
  exit 1
fi

echo "Token JWT obtenu avec succès!"
echo "ID Utilisateur: $USER_ID"
echo ""

# Récupérer un ID de propriété pour le test
echo "Récupération d'une propriété pour le test..."
PROPERTY_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/properties?host_id=eq.${USER_ID}&select=id,address&limit=1" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

PROPERTY_ID=$(echo $PROPERTY_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
# Utiliser l'adresse comme nom de propriété si disponible, sinon utiliser "Propriété sans nom"
PROPERTY_ADDRESS=$(echo $PROPERTY_RESPONSE | grep -o '"address":{[^}]*}' | head -1)
if [ -n "$PROPERTY_ADDRESS" ]; then
  PROPERTY_NAME="Propriété avec adresse"
else
  PROPERTY_NAME="Propriété sans nom"
fi

if [ -z "$PROPERTY_ID" ]; then
  echo "Aucune propriété trouvée. Veuillez créer une propriété dans la base de données."
  echo "Vous pouvez exécuter cette requête SQL dans l'éditeur SQL de Supabase :"
  echo "INSERT INTO properties (id, host_id, address, ai_instructions, ai_enabled, ai_config)"
  echo "VALUES (gen_random_uuid(), '$USER_ID', '{\"street\": \"123 Rue de Test\", \"city\": \"Paris\", \"country\": \"France\"}', 'Instructions pour le test', true, '{}');"
  exit 1
else
  echo "Propriété sélectionnée: $PROPERTY_NAME (ID: $PROPERTY_ID)"
fi
echo ""

# Générer un numéro de téléphone aléatoire pour éviter les doublons
RANDOM_PHONE="+336$(printf '%08d' $RANDOM)"

# Date actuelle + 2 jours et + 5 jours pour les dates de séjour
CHECK_IN_DATE=$(date -v+2d "+%Y-%m-%d")
CHECK_OUT_DATE=$(date -v+5d "+%Y-%m-%d")
GUEST_NAME="Invité Test $(date +%H%M%S)"

# Créer la conversation
echo "Création d'une conversation de test..."
CONVERSATION_DATA="{\"host_id\":\"${USER_ID}\",\"guest_name\":\"${GUEST_NAME}\",\"guest_phone\":\"${RANDOM_PHONE}\",\"property_id\":\"${PROPERTY_ID}\",\"check_in_date\":\"${CHECK_IN_DATE}\",\"check_out_date\":\"${CHECK_OUT_DATE}\"}"

echo "Données: $CONVERSATION_DATA"
echo ""

# Appel à l'Edge Function
echo "Appel de l'Edge Function create-conversation..."
RESPONSE=$(curl -s -X POST "${FUNCTION_URL}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$CONVERSATION_DATA")

# Afficher les résultats de manière formatée
echo ""
echo "=== Résultat ==="
echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""
echo "Test terminé!"
