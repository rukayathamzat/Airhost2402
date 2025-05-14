#!/bin/bash

echo "Testing production connection with psql..."
PGPASSWORD=AirhostDB2025 psql -h aws-0-eu-west-3.pooler.supabase.com -p 6543 -U postgres.tornfqtvnzkgnwfudxdb -d postgres -c "SELECT current_timestamp, current_database();" -v ON_ERROR_STOP=1

echo -e "\nTesting recette connection with psql..."
PGPASSWORD=AirhostDB2025 psql -h aws-0-eu-west-3.pooler.supabase.com -p 6543 -U postgres.pnbfsiicxhckptlgtjoj -d postgres -c "SELECT current_timestamp, current_database();" -v ON_ERROR_STOP=1
