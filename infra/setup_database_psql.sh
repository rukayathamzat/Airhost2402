#!/bin/bash

# Configuration
DB_HOST="db.tornfqtvnzkgnwfudxdb.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="A0Gt3GGRUeMkaX8mzkxV+pi7faWUkf96Ji7ulE+D1SE80NBqCHOkCpCdNH4dlWO0UkywHsgOTbc14p/OrKIqhw=="

# Fonction pour exécuter un script SQL
execute_sql_file() {
    local file="$1"
    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -d "${DB_NAME}" \
        -U "${DB_USER}" \
        -f "$file"
}

# Exécuter les scripts dans l'ordre
echo "1. Suppression des tables..."
execute_sql_file "drop_tables.sql"

echo "2. Création des tables..."
execute_sql_file "create_tables_v3.sql"

echo "3. Insertion des données..."
execute_sql_file "insert_test_data_v4.sql"

echo "Configuration de la base de données terminée!"
