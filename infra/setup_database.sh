#!/bin/bash

# Configuration
SUPABASE_URL="https://tornfqtvnzkgnwfudxdb.supabase.co/rest/v1/rpc/exec_sql"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4MzY0NSwiZXhwIjoyMDU1MzU5NjQ1fQ.nbhxWUoyYT5a8XxpC2la9sMYMKDJL95YQ9hhFvy5tos"

# Fonction pour exécuter un script SQL
execute_sql() {
    local sql_content="$1"
    curl -X POST "${SUPABASE_URL}" \
        -H "apikey: ${AUTH_TOKEN}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"sql\": \"${sql_content}\"}"
    echo
}

# Lire et exécuter les scripts dans l'ordre
echo "1. Suppression des tables..."
sql_content=$(cat drop_tables.sql)
execute_sql "$sql_content"

echo "2. Création des tables..."
sql_content=$(cat create_tables_v3.sql)
execute_sql "$sql_content"

echo "3. Insertion des données..."
sql_content=$(cat insert_test_data_v4.sql)
execute_sql "$sql_content"

echo "Configuration de la base de données terminée!"
