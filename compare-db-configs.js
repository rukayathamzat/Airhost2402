const { Pool } = require('pg');

// Désactiver globalement la vérification des certificats SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Chaînes de connexion complètes
const prodConnectionString = 'postgres://postgres.tornfqtvnzkgnwfudxdb:AirhostDB2025@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require';
const recetteConnectionString = 'postgres://postgres.pnbfsiicxhckptlgtjoj:AirhostDB2025@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require';

// Configuration pour la production
const prodPool = new Pool({
  connectionString: prodConnectionString
});

// Configuration pour la recette
const recettePool = new Pool({
  connectionString: recetteConnectionString
});

// Requêtes pour obtenir des informations sur la configuration
const configQueries = [
  {
    name: "Version PostgreSQL",
    query: "SELECT version();"
  },
  {
    name: "Paramètres de configuration",
    query: "SELECT name, setting, category FROM pg_settings WHERE name IN ('max_connections', 'shared_buffers', 'work_mem', 'maintenance_work_mem', 'effective_cache_size', 'max_wal_size');"
  },
  {
    name: "Extensions installées",
    query: "SELECT extname, extversion FROM pg_extension;"
  },
  {
    name: "Règles de restriction IP",
    query: "SELECT * FROM pg_hba_file_rules;"
  },
  {
    name: "Utilisateurs et rôles",
    query: "SELECT rolname, rolsuper, rolcreaterole, rolcreatedb FROM pg_roles;"
  },
  {
    name: "Schémas disponibles",
    query: "SELECT schema_name FROM information_schema.schemata;"
  },
  {
    name: "Tables dans le schéma public",
    query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
  }
];

async function compareConfigurations() {
  console.log('Comparaison des configurations des bases de données...\n');
  
  for (const queryInfo of configQueries) {
    console.log(`\n=== ${queryInfo.name} ===`);
    
    // Recette
    try {
      console.log('\nRECETTE:');
      const recetteRes = await recettePool.query(queryInfo.query);
      console.log(JSON.stringify(recetteRes.rows, null, 2));
    } catch (err) {
      console.log(`Erreur (recette): ${err.message}`);
    }
    
    // Production
    try {
      console.log('\nPRODUCTION:');
      const prodRes = await prodPool.query(queryInfo.query);
      console.log(JSON.stringify(prodRes.rows, null, 2));
    } catch (err) {
      console.log(`Erreur (production): ${err.message}`);
    }
    
    console.log('\n' + '-'.repeat(50));
  }
  
  // Fermer les connexions
  prodPool.end();
  recettePool.end();
}

compareConfigurations().catch(err => {
  console.error('Erreur globale:', err);
  process.exit(1);
});
