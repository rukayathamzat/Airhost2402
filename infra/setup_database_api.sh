#!/bin/bash

# Configuration
SUPABASE_URL="https://tornfqtvnzkgnwfudxdb.supabase.co"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4MzY0NSwiZXhwIjoyMDU1MzU5NjQ1fQ.nbhxWUoyYT5a8XxpC2la9sMYMKDJL95YQ9hhFvy5tos"

# Fonction pour exécuter une requête SQL via l'API
execute_sql() {
    local sql="$1"
    curl -X POST "${SUPABASE_URL}/rest/v1/rpc/execute_sql" \
        -H "apikey: ${AUTH_TOKEN}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"${sql}\"}"
    echo
}

# Lire et exécuter les scripts
echo "1. Suppression des tables..."
sql=$(cat drop_tables.sql)
execute_sql "${sql}"

echo "2. Création des tables..."
sql=$(cat create_tables_v3.sql)
execute_sql "${sql}"

echo "3. Insertion des données..."
sql=$(cat insert_test_data_v4.sql)
execute_sql "${sql}"

echo "Configuration de la base de données terminée!"
