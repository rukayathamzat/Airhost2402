const { Pool, Client } = require('pg');
const dns = require('dns').promises;
const os = require('os');
const http = require('http');

// Fonction pour obtenir l'adresse IP publique
async function getPublicIp() {
  return new Promise((resolve, reject) => {
    http.get('http://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data.trim());
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Fonction pour obtenir les informations DNS
async function getDnsInfo(hostname) {
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    return addresses;
  } catch (err) {
    return { error: err.message };
  }
}

// Fonction pour obtenir les informations réseau locales
async function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const results = {};
  
  for (const [name, netInterface] of Object.entries(interfaces)) {
    results[name] = netInterface.filter(iface => !iface.internal);
  }
  
  return results;
}

// Chaînes de connexion complètes
const prodConnectionString = 'postgres://postgres.tornfqtvnzkgnwfudxdb:AirhostDB2025@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require';
const recetteConnectionString = 'postgres://postgres.pnbfsiicxhckptlgtjoj:AirhostDB2025@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require';

// Désactiver globalement la vérification des certificats SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configuration pour la production
const prodPool = new Pool({
  connectionString: prodConnectionString,
  // Paramètres de connexion supplémentaires
  connectionTimeoutMillis: 10000, // 10 secondes
  query_timeout: 10000,
  statement_timeout: 10000
});

// Configuration pour la recette
const recettePool = new Pool({
  connectionString: recetteConnectionString,
  // Paramètres de connexion supplémentaires
  connectionTimeoutMillis: 10000, // 10 secondes
  query_timeout: 10000,
  statement_timeout: 10000
});

// Ajouter des écouteurs d'événements pour les erreurs de pool
prodPool.on('error', (err) => {
  console.error('Erreur inattendue du pool de production:', err);
});

recettePool.on('error', (err) => {
  console.error('Erreur inattendue du pool de recette:', err);
});

async function testConnections() {
  // Obtenir les informations réseau
  console.log('=== INFORMATIONS RÉSEAU ===');
  try {
    const publicIp = await getPublicIp();
    console.log('Adresse IP publique:', publicIp);
    
    const networkInfo = await getNetworkInfo();
    console.log('Interfaces réseau locales:', JSON.stringify(networkInfo, null, 2));
    
    const prodDnsInfo = await getDnsInfo('aws-0-eu-west-3.pooler.supabase.com');
    console.log('DNS pour aws-0-eu-west-3.pooler.supabase.com:', JSON.stringify(prodDnsInfo, null, 2));
  } catch (err) {
    console.error('Erreur lors de la récupération des informations réseau:', err);
  }
  
  console.log('\n=== TEST DE CONNEXION PRODUCTION ===');
  try {
    // Afficher les informations de connexion (sans le mot de passe)
    const prodConnInfo = prodConnectionString.replace(/:[^:]*@/, ':***@');
    console.log('Production connection string:', prodConnInfo);
    
    // Tester la connexion avec un client individuel pour plus de détails
    const client = new Client({
      connectionString: prodConnectionString,
      connectionTimeoutMillis: 10000
    });
    
    console.log('Tentative de connexion à la production...');
    await client.connect();
    console.log('Connexion établie avec succès!');
    
    const prodRes = await client.query('SELECT current_timestamp, current_database();');
    console.log('Production connection successful:', prodRes.rows[0]);
    
    // Test supplémentaire pour vérifier l'accès aux tables
    try {
      const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5;");
      console.log('Production tables (top 5):', tablesRes.rows.map(row => row.table_name));
    } catch (tableErr) {
      console.log('Could not list tables:', tableErr.message);
    }
    
    await client.end();
  } catch (err) {
    console.error('Production connection error:', err);
    console.error('Error details:', JSON.stringify(err, null, 2));
    
    // Essayer une connexion alternative sans SSL
    try {
      console.log('\nEssai de connexion alternative à la production (sans SSL)...');
      const altClient = new Client({
        user: 'postgres.tornfqtvnzkgnwfudxdb',
        host: 'aws-0-eu-west-3.pooler.supabase.com',
        database: 'postgres',
        password: 'AirhostDB2025',
        port: 6543,
        connectionTimeoutMillis: 10000
      });
      
      await altClient.connect();
      console.log('Connexion alternative réussie!');
      await altClient.end();
    } catch (altErr) {
      console.error('Erreur de connexion alternative:', altErr.message);
    }
  }

  console.log('\n=== TEST DE CONNEXION RECETTE ===');
  try {
    // Afficher les informations de connexion (sans le mot de passe)
    const recetteConnInfo = recetteConnectionString.replace(/:[^:]*@/, ':***@');
    console.log('Recette connection string:', recetteConnInfo);
    
    // Tester la connexion avec un client individuel pour plus de détails
    const client = new Client({
      connectionString: recetteConnectionString,
      connectionTimeoutMillis: 10000
    });
    
    console.log('Tentative de connexion à la recette...');
    await client.connect();
    console.log('Connexion établie avec succès!');
    
    const recetteRes = await client.query('SELECT current_timestamp, current_database();');
    console.log('Recette connection successful:', recetteRes.rows[0]);
    
    // Test supplémentaire pour vérifier l'accès aux tables
    try {
      const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5;");
      console.log('Recette tables (top 5):', tablesRes.rows.map(row => row.table_name));
    } catch (tableErr) {
      console.log('Could not list tables:', tableErr.message);
    }
    
    await client.end();
  } catch (err) {
    console.error('Recette connection error:', err);
    console.error('Error details:', JSON.stringify(err, null, 2));
    
    // Essayer une connexion alternative sans SSL
    try {
      console.log('\nEssai de connexion alternative à la recette (sans SSL)...');
      const altClient = new Client({
        user: 'postgres.pnbfsiicxhckptlgtjoj',
        host: 'aws-0-eu-west-3.pooler.supabase.com',
        database: 'postgres',
        password: 'AirhostDB2025',
        port: 6543,
        connectionTimeoutMillis: 10000
      });
      
      await altClient.connect();
      console.log('Connexion alternative réussie!');
      await altClient.end();
    } catch (altErr) {
      console.error('Erreur de connexion alternative:', altErr.message);
    }
  }
}

testConnections();
