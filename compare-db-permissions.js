const { Client } = require('pg');
const fs = require('fs');

// Désactiver globalement la vérification des certificats SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Chaînes de connexion complètes
const prodConnectionString = 'postgres://postgres.tornfqtvnzkgnwfudxdb:AirhostDB2025@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require&ssl=true&sslmode=no-verify';
const recetteConnectionString = 'postgres://postgres.pnbfsiicxhckptlgtjoj:AirhostDB2025@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require&ssl=true&sslmode=no-verify';

// Requêtes pour obtenir des informations sur la configuration et les permissions
const queries = [
  {
    name: "Version PostgreSQL",
    query: "SELECT version();"
  },
  {
    name: "Paramètres de configuration",
    query: `SELECT name, setting, category 
            FROM pg_settings 
            WHERE name IN (
              'max_connections', 'shared_buffers', 'work_mem', 
              'maintenance_work_mem', 'effective_cache_size', 'max_wal_size',
              'statement_timeout', 'lock_timeout', 'idle_in_transaction_session_timeout',
              'max_locks_per_transaction', 'max_pred_locks_per_transaction'
            )
            ORDER BY category, name;`
  },
  {
    name: "Extensions installées",
    query: "SELECT extname, extversion FROM pg_extension ORDER BY extname;"
  },
  {
    name: "Schémas disponibles",
    query: "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;"
  },
  {
    name: "Tables dans le schéma public",
    query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  },
  {
    name: "Structure des tables",
    query: `SELECT 
              t.table_name, 
              c.column_name, 
              c.data_type, 
              c.character_maximum_length,
              c.is_nullable,
              c.column_default
            FROM 
              information_schema.tables t
            JOIN 
              information_schema.columns c 
            ON 
              t.table_name = c.table_name AND t.table_schema = c.table_schema
            WHERE 
              t.table_schema = 'public'
            ORDER BY 
              t.table_name, c.ordinal_position;`
  },
  {
    name: "Contraintes",
    query: `SELECT 
              tc.table_name, 
              tc.constraint_name, 
              tc.constraint_type,
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
            FROM 
              information_schema.table_constraints tc
            LEFT JOIN 
              information_schema.key_column_usage kcu
            ON 
              tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            LEFT JOIN 
              information_schema.constraint_column_usage ccu
            ON 
              ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE 
              tc.table_schema = 'public'
            ORDER BY 
              tc.table_name, tc.constraint_name;`
  },
  {
    name: "Index",
    query: `SELECT
              tablename,
              indexname,
              indexdef
            FROM
              pg_indexes
            WHERE
              schemaname = 'public'
            ORDER BY
              tablename, indexname;`
  },
  {
    name: "Triggers",
    query: `SELECT
              event_object_table AS table_name,
              trigger_name,
              action_timing,
              event_manipulation,
              action_statement
            FROM
              information_schema.triggers
            WHERE
              trigger_schema = 'public'
            ORDER BY
              event_object_table, trigger_name;`
  },
  {
    name: "Rôles et permissions",
    query: `SELECT 
              r.rolname, 
              r.rolsuper, 
              r.rolinherit,
              r.rolcreaterole,
              r.rolcreatedb,
              r.rolcanlogin,
              r.rolreplication,
              r.rolconnlimit,
              r.rolvaliduntil
            FROM 
              pg_roles r
            ORDER BY 
              r.rolname;`
  },
  {
    name: "Permissions sur les tables",
    query: `SELECT
              grantor, 
              grantee, 
              table_name, 
              privilege_type
            FROM 
              information_schema.table_privileges
            WHERE 
              table_schema = 'public'
            ORDER BY 
              table_name, grantee, privilege_type;`
  },
  {
    name: "Permissions sur les schémas",
    query: `SELECT
              grantor,
              grantee,
              schema_name,
              privilege_type
            FROM
              information_schema.schema_privileges
            ORDER BY
              schema_name, grantee, privilege_type;`
  },
  {
    name: "Fonctions",
    query: `SELECT
              routine_name,
              routine_type,
              data_type,
              external_language
            FROM
              information_schema.routines
            WHERE
              routine_schema = 'public'
            ORDER BY
              routine_name;`
  }
];

// Fonction pour exécuter une requête et retourner les résultats
async function executeQuery(client, query) {
  try {
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    return { error: err.message };
  }
}

// Fonction pour comparer deux ensembles de résultats
function compareResults(prodResults, recetteResults) {
  // Si l'un des résultats est une erreur, retourner les deux résultats
  if (prodResults.error || recetteResults.error) {
    return {
      identical: false,
      prodResults,
      recetteResults,
      differences: "Erreur lors de l'exécution de la requête"
    };
  }

  // Si le nombre de lignes est différent
  if (prodResults.length !== recetteResults.length) {
    return {
      identical: false,
      prodCount: prodResults.length,
      recetteCount: recetteResults.length,
      differences: "Nombre différent d'éléments"
    };
  }

  // Comparer chaque ligne
  const differences = [];
  for (let i = 0; i < prodResults.length; i++) {
    const prodRow = prodResults[i];
    const recetteRow = recetteResults[i];
    
    // Comparer les propriétés de chaque ligne
    const prodKeys = Object.keys(prodRow);
    const recetteKeys = Object.keys(recetteRow);
    
    // Si le nombre de propriétés est différent
    if (prodKeys.length !== recetteKeys.length) {
      differences.push({
        index: i,
        reason: "Nombre différent de propriétés",
        prod: prodRow,
        recette: recetteRow
      });
      continue;
    }
    
    // Comparer chaque propriété
    for (const key of prodKeys) {
      if (JSON.stringify(prodRow[key]) !== JSON.stringify(recetteRow[key])) {
        differences.push({
          index: i,
          property: key,
          prodValue: prodRow[key],
          recetteValue: recetteRow[key]
        });
      }
    }
  }

  return {
    identical: differences.length === 0,
    differences: differences.length > 0 ? differences : "Aucune différence"
  };
}

async function compareConfigurations() {
  console.log('Comparaison des configurations et permissions des bases de données...\n');
  
  // Créer les clients de connexion
  const prodClient = new Client({
    connectionString: prodConnectionString,
    connectionTimeoutMillis: 10000
  });
  
  const recetteClient = new Client({
    connectionString: recetteConnectionString,
    connectionTimeoutMillis: 10000
  });
  
  try {
    // Se connecter aux bases de données
    await prodClient.connect();
    await recetteClient.connect();
    
    console.log('Connexions établies avec succès!\n');
    
    // Stocker les résultats pour le rapport final
    const results = {};
    
    // Exécuter chaque requête
    for (const queryInfo of queries) {
      console.log(`\n=== ${queryInfo.name} ===`);
      
      // Exécuter la requête sur les deux bases de données
      const prodResults = await executeQuery(prodClient, queryInfo.query);
      const recetteResults = await executeQuery(recetteClient, queryInfo.query);
      
      // Comparer les résultats
      const comparison = compareResults(prodResults, recetteResults);
      
      // Afficher le résultat de la comparaison
      if (comparison.identical) {
        console.log(`✅ IDENTIQUE: Les configurations sont identiques pour "${queryInfo.name}"`);
      } else {
        console.log(`❌ DIFFÉRENT: Des différences ont été trouvées pour "${queryInfo.name}"`);
        console.log('Différences:', JSON.stringify(comparison.differences, null, 2));
      }
      
      // Stocker les résultats
      results[queryInfo.name] = {
        identical: comparison.identical,
        prodResults,
        recetteResults,
        comparison
      };
      
      console.log('\n' + '-'.repeat(50));
    }
    
    // Générer un rapport détaillé
    const reportPath = './db-comparison-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nRapport détaillé généré: ${reportPath}`);
    
    // Résumé final
    console.log('\n=== RÉSUMÉ DE LA COMPARAISON ===');
    let identicalCount = 0;
    let differentCount = 0;
    
    for (const [name, result] of Object.entries(results)) {
      if (result.identical) {
        identicalCount++;
        console.log(`✅ ${name}`);
      } else {
        differentCount++;
        console.log(`❌ ${name}`);
      }
    }
    
    console.log(`\nTotal: ${identicalCount + differentCount} catégories comparées`);
    console.log(`✅ Identiques: ${identicalCount}`);
    console.log(`❌ Différentes: ${differentCount}`);
    
  } catch (err) {
    console.error('Erreur lors de la comparaison:', err);
  } finally {
    // Fermer les connexions
    await prodClient.end();
    await recetteClient.end();
  }
}

// Exécuter la comparaison
compareConfigurations().catch(err => {
  console.error('Erreur globale:', err);
  process.exit(1);
});
