const { Client } = require('pg');
const fs = require('fs');

// Désactiver globalement la vérification des certificats SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Chaînes de connexion complètes
const prodConnectionString = 'postgres://postgres.tornfqtvnzkgnwfudxdb:AirhostDB2025@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require&ssl=true&sslmode=no-verify';
const recetteConnectionString = 'postgres://postgres.pnbfsiicxhckptlgtjoj:AirhostDB2025@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require&ssl=true&sslmode=no-verify';

// Requêtes spécifiques pour comparer les tables importantes
const queries = [
  {
    name: "Liste des tables",
    query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  },
  {
    name: "Structure de la table 'conversations'",
    query: `SELECT 
              column_name, 
              data_type, 
              character_maximum_length,
              is_nullable,
              column_default
            FROM 
              information_schema.columns 
            WHERE 
              table_schema = 'public' AND table_name = 'conversations'
            ORDER BY 
              ordinal_position;`
  },
  {
    name: "Structure de la table 'messages'",
    query: `SELECT 
              column_name, 
              data_type, 
              character_maximum_length,
              is_nullable,
              column_default
            FROM 
              information_schema.columns 
            WHERE 
              table_schema = 'public' AND table_name = 'messages'
            ORDER BY 
              ordinal_position;`
  },
  {
    name: "Structure de la table 'whatsapp_config'",
    query: `SELECT 
              column_name, 
              data_type, 
              character_maximum_length,
              is_nullable,
              column_default
            FROM 
              information_schema.columns 
            WHERE 
              table_schema = 'public' AND table_name = 'whatsapp_config'
            ORDER BY 
              ordinal_position;`
  },
  {
    name: "Permissions sur la table 'conversations'",
    query: `SELECT
              grantor, 
              grantee, 
              privilege_type
            FROM 
              information_schema.table_privileges
            WHERE 
              table_schema = 'public' AND table_name = 'conversations'
            ORDER BY 
              grantee, privilege_type;`
  },
  {
    name: "Permissions sur la table 'messages'",
    query: `SELECT
              grantor, 
              grantee, 
              privilege_type
            FROM 
              information_schema.table_privileges
            WHERE 
              table_schema = 'public' AND table_name = 'messages'
            ORDER BY 
              grantee, privilege_type;`
  },
  {
    name: "Permissions sur la table 'whatsapp_config'",
    query: `SELECT
              grantor, 
              grantee, 
              privilege_type
            FROM 
              information_schema.table_privileges
            WHERE 
              table_schema = 'public' AND table_name = 'whatsapp_config'
            ORDER BY 
              grantee, privilege_type;`
  },
  {
    name: "Triggers sur la table 'messages'",
    query: `SELECT
              trigger_name,
              action_timing,
              event_manipulation,
              action_statement
            FROM
              information_schema.triggers
            WHERE
              trigger_schema = 'public' AND event_object_table = 'messages'
            ORDER BY
              trigger_name;`
  },
  {
    name: "Triggers sur la table 'conversations'",
    query: `SELECT
              trigger_name,
              action_timing,
              event_manipulation,
              action_statement
            FROM
              information_schema.triggers
            WHERE
              trigger_schema = 'public' AND event_object_table = 'conversations'
            ORDER BY
              trigger_name;`
  },
  {
    name: "Triggers sur la table 'whatsapp_config'",
    query: `SELECT
              trigger_name,
              action_timing,
              event_manipulation,
              action_statement
            FROM
              information_schema.triggers
            WHERE
              trigger_schema = 'public' AND event_object_table = 'whatsapp_config'
            ORDER BY
              trigger_name;`
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
      differences: "Nombre différent d'éléments",
      prodResults,
      recetteResults
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

// Fonction pour générer des scripts SQL de synchronisation
function generateSyncScripts(results) {
  let syncScripts = {
    prodToRecette: "",
    recetteToProd: ""
  };
  
  // Générer des scripts pour les tables manquantes
  if (results["Liste des tables"] && !results["Liste des tables"].identical) {
    const prodTables = results["Liste des tables"].prodResults.map(row => row.table_name);
    const recetteTables = results["Liste des tables"].recetteResults.map(row => row.table_name);
    
    // Tables présentes en prod mais pas en recette
    const tablesOnlyInProd = prodTables.filter(table => !recetteTables.includes(table));
    if (tablesOnlyInProd.length > 0) {
      syncScripts.prodToRecette += "-- Tables présentes en production mais pas en recette\n";
      tablesOnlyInProd.forEach(table => {
        syncScripts.prodToRecette += `-- Créer la table '${table}' en recette\n`;
        syncScripts.prodToRecette += `-- CREATE TABLE public.${table} (...); -- Définition à compléter\n\n`;
      });
    }
    
    // Tables présentes en recette mais pas en prod
    const tablesOnlyInRecette = recetteTables.filter(table => !prodTables.includes(table));
    if (tablesOnlyInRecette.length > 0) {
      syncScripts.recetteToProd += "-- Tables présentes en recette mais pas en production\n";
      tablesOnlyInRecette.forEach(table => {
        syncScripts.recetteToProd += `-- Créer la table '${table}' en production\n`;
        syncScripts.recetteToProd += `-- CREATE TABLE public.${table} (...); -- Définition à compléter\n\n`;
      });
    }
  }
  
  // Générer des scripts pour les différences de structure de tables
  const tablesToCheck = ['conversations', 'messages', 'whatsapp_config'];
  tablesToCheck.forEach(table => {
    const structureKey = `Structure de la table '${table}'`;
    if (results[structureKey] && !results[structureKey].identical) {
      // Différences de colonnes
      if (results[structureKey].comparison.differences !== "Aucune différence") {
        syncScripts.prodToRecette += `-- Différences de structure pour la table '${table}'\n`;
        syncScripts.recetteToProd += `-- Différences de structure pour la table '${table}'\n`;
        
        if (Array.isArray(results[structureKey].comparison.differences)) {
          results[structureKey].comparison.differences.forEach(diff => {
            if (diff.property === "column_name") {
              syncScripts.prodToRecette += `-- Colonne différente: ${diff.prodValue} (prod) vs ${diff.recetteValue} (recette)\n`;
              syncScripts.recetteToProd += `-- Colonne différente: ${diff.recetteValue} (recette) vs ${diff.prodValue} (prod)\n`;
            } else if (diff.property === "data_type" || diff.property === "character_maximum_length" || diff.property === "is_nullable" || diff.property === "column_default") {
              const prodRow = results[structureKey].prodResults[diff.index];
              const recetteRow = results[structureKey].recetteResults[diff.index];
              
              syncScripts.prodToRecette += `-- Modifier la colonne '${recetteRow.column_name}' en recette:\n`;
              syncScripts.prodToRecette += `-- ALTER TABLE public.${table} ALTER COLUMN ${recetteRow.column_name} TYPE ${prodRow.data_type};\n`;
              if (prodRow.is_nullable === "NO" && recetteRow.is_nullable === "YES") {
                syncScripts.prodToRecette += `-- ALTER TABLE public.${table} ALTER COLUMN ${recetteRow.column_name} SET NOT NULL;\n`;
              } else if (prodRow.is_nullable === "YES" && recetteRow.is_nullable === "NO") {
                syncScripts.prodToRecette += `-- ALTER TABLE public.${table} ALTER COLUMN ${recetteRow.column_name} DROP NOT NULL;\n`;
              }
              if (prodRow.column_default !== recetteRow.column_default) {
                if (prodRow.column_default) {
                  syncScripts.prodToRecette += `-- ALTER TABLE public.${table} ALTER COLUMN ${recetteRow.column_name} SET DEFAULT ${prodRow.column_default};\n`;
                } else {
                  syncScripts.prodToRecette += `-- ALTER TABLE public.${table} ALTER COLUMN ${recetteRow.column_name} DROP DEFAULT;\n`;
                }
              }
              
              syncScripts.recetteToProd += `-- Modifier la colonne '${prodRow.column_name}' en production:\n`;
              syncScripts.recetteToProd += `-- ALTER TABLE public.${table} ALTER COLUMN ${prodRow.column_name} TYPE ${recetteRow.data_type};\n`;
              if (recetteRow.is_nullable === "NO" && prodRow.is_nullable === "YES") {
                syncScripts.recetteToProd += `-- ALTER TABLE public.${table} ALTER COLUMN ${prodRow.column_name} SET NOT NULL;\n`;
              } else if (recetteRow.is_nullable === "YES" && prodRow.is_nullable === "NO") {
                syncScripts.recetteToProd += `-- ALTER TABLE public.${table} ALTER COLUMN ${prodRow.column_name} DROP NOT NULL;\n`;
              }
              if (recetteRow.column_default !== prodRow.column_default) {
                if (recetteRow.column_default) {
                  syncScripts.recetteToProd += `-- ALTER TABLE public.${table} ALTER COLUMN ${prodRow.column_name} SET DEFAULT ${recetteRow.column_default};\n`;
                } else {
                  syncScripts.recetteToProd += `-- ALTER TABLE public.${table} ALTER COLUMN ${prodRow.column_name} DROP DEFAULT;\n`;
                }
              }
            }
          });
        } else if (results[structureKey].comparison.differences === "Nombre différent d'éléments") {
          // Colonnes présentes en prod mais pas en recette
          const prodColumns = results[structureKey].prodResults.map(row => row.column_name);
          const recetteColumns = results[structureKey].recetteResults.map(row => row.column_name);
          
          const columnsOnlyInProd = prodColumns.filter(col => !recetteColumns.includes(col));
          if (columnsOnlyInProd.length > 0) {
            syncScripts.prodToRecette += `-- Colonnes présentes en production mais pas en recette pour la table '${table}':\n`;
            columnsOnlyInProd.forEach(col => {
              const colDef = results[structureKey].prodResults.find(row => row.column_name === col);
              syncScripts.prodToRecette += `-- ALTER TABLE public.${table} ADD COLUMN ${col} ${colDef.data_type}`;
              if (colDef.character_maximum_length) {
                syncScripts.prodToRecette += `(${colDef.character_maximum_length})`;
              }
              if (colDef.is_nullable === "NO") {
                syncScripts.prodToRecette += " NOT NULL";
              }
              if (colDef.column_default) {
                syncScripts.prodToRecette += ` DEFAULT ${colDef.column_default}`;
              }
              syncScripts.prodToRecette += ";\n";
            });
          }
          
          const columnsOnlyInRecette = recetteColumns.filter(col => !prodColumns.includes(col));
          if (columnsOnlyInRecette.length > 0) {
            syncScripts.recetteToProd += `-- Colonnes présentes en recette mais pas en production pour la table '${table}':\n`;
            columnsOnlyInRecette.forEach(col => {
              const colDef = results[structureKey].recetteResults.find(row => row.column_name === col);
              syncScripts.recetteToProd += `-- ALTER TABLE public.${table} ADD COLUMN ${col} ${colDef.data_type}`;
              if (colDef.character_maximum_length) {
                syncScripts.recetteToProd += `(${colDef.character_maximum_length})`;
              }
              if (colDef.is_nullable === "NO") {
                syncScripts.recetteToProd += " NOT NULL";
              }
              if (colDef.column_default) {
                syncScripts.recetteToProd += ` DEFAULT ${colDef.column_default}`;
              }
              syncScripts.recetteToProd += ";\n";
            });
          }
        }
        
        syncScripts.prodToRecette += "\n";
        syncScripts.recetteToProd += "\n";
      }
    }
  });
  
  // Générer des scripts pour les différences de permissions
  tablesToCheck.forEach(table => {
    const permissionsKey = `Permissions sur la table '${table}'`;
    if (results[permissionsKey] && !results[permissionsKey].identical) {
      syncScripts.prodToRecette += `-- Différences de permissions pour la table '${table}'\n`;
      syncScripts.recetteToProd += `-- Différences de permissions pour la table '${table}'\n`;
      
      // Permissions présentes en prod mais pas en recette
      const prodPermissions = results[permissionsKey].prodResults.map(row => 
        `${row.grantee}|${row.privilege_type}`);
      const recettePermissions = results[permissionsKey].recetteResults.map(row => 
        `${row.grantee}|${row.privilege_type}`);
      
      const permissionsOnlyInProd = prodPermissions.filter(perm => !recettePermissions.includes(perm));
      if (permissionsOnlyInProd.length > 0) {
        syncScripts.prodToRecette += `-- Permissions présentes en production mais pas en recette:\n`;
        permissionsOnlyInProd.forEach(perm => {
          const [grantee, privilege] = perm.split('|');
          syncScripts.prodToRecette += `-- GRANT ${privilege} ON TABLE public.${table} TO ${grantee};\n`;
        });
      }
      
      const permissionsOnlyInRecette = recettePermissions.filter(perm => !prodPermissions.includes(perm));
      if (permissionsOnlyInRecette.length > 0) {
        syncScripts.recetteToProd += `-- Permissions présentes en recette mais pas en production:\n`;
        permissionsOnlyInRecette.forEach(perm => {
          const [grantee, privilege] = perm.split('|');
          syncScripts.recetteToProd += `-- GRANT ${privilege} ON TABLE public.${table} TO ${grantee};\n`;
        });
      }
      
      syncScripts.prodToRecette += "\n";
      syncScripts.recetteToProd += "\n";
    }
  });
  
  // Générer des scripts pour les différences de triggers
  tablesToCheck.forEach(table => {
    const triggersKey = `Triggers sur la table '${table}'`;
    if (results[triggersKey] && !results[triggersKey].identical) {
      syncScripts.prodToRecette += `-- Différences de triggers pour la table '${table}'\n`;
      syncScripts.recetteToProd += `-- Différences de triggers pour la table '${table}'\n`;
      
      if (results[triggersKey].comparison.differences === "Nombre différent d'éléments") {
        // Triggers présents en prod mais pas en recette
        const prodTriggers = results[triggersKey].prodResults.map(row => row.trigger_name);
        const recetteTriggers = results[triggersKey].recetteResults.map(row => row.trigger_name);
        
        const triggersOnlyInProd = prodTriggers.filter(trig => !recetteTriggers.includes(trig));
        if (triggersOnlyInProd.length > 0) {
          syncScripts.prodToRecette += `-- Triggers présents en production mais pas en recette:\n`;
          triggersOnlyInProd.forEach(trig => {
            const trigDef = results[triggersKey].prodResults.find(row => row.trigger_name === trig);
            syncScripts.prodToRecette += `-- Créer le trigger '${trig}' en recette:\n`;
            syncScripts.prodToRecette += `-- CREATE TRIGGER ${trig}\n`;
            syncScripts.prodToRecette += `--   ${trigDef.action_timing} ${trigDef.event_manipulation}\n`;
            syncScripts.prodToRecette += `--   ON public.${table}\n`;
            syncScripts.prodToRecette += `--   EXECUTE FUNCTION ${trigDef.action_statement.split('FUNCTION ')[1].split('(')[0]}();\n`;
          });
        }
        
        const triggersOnlyInRecette = recetteTriggers.filter(trig => !prodTriggers.includes(trig));
        if (triggersOnlyInRecette.length > 0) {
          syncScripts.recetteToProd += `-- Triggers présents en recette mais pas en production:\n`;
          triggersOnlyInRecette.forEach(trig => {
            const trigDef = results[triggersKey].recetteResults.find(row => row.trigger_name === trig);
            syncScripts.recetteToProd += `-- Créer le trigger '${trig}' en production:\n`;
            syncScripts.recetteToProd += `-- CREATE TRIGGER ${trig}\n`;
            syncScripts.recetteToProd += `--   ${trigDef.action_timing} ${trigDef.event_manipulation}\n`;
            syncScripts.recetteToProd += `--   ON public.${table}\n`;
            syncScripts.recetteToProd += `--   EXECUTE FUNCTION ${trigDef.action_statement.split('FUNCTION ')[1].split('(')[0]}();\n`;
          });
        }
      }
      
      syncScripts.prodToRecette += "\n";
      syncScripts.recetteToProd += "\n";
    }
  });
  
  return syncScripts;
}

async function compareSpecificTables() {
  console.log('Comparaison des tables spécifiques entre production et recette...\n');
  
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
        
        if (comparison.differences === "Nombre différent d'éléments") {
          console.log(`Production: ${comparison.prodCount} éléments, Recette: ${comparison.recetteCount} éléments`);
          
          // Afficher les éléments spécifiques à chaque environnement
          if (queryInfo.name === "Liste des tables") {
            const prodTables = prodResults.map(row => row.table_name);
            const recetteTables = recetteResults.map(row => row.table_name);
            
            const tablesOnlyInProd = prodTables.filter(table => !recetteTables.includes(table));
            if (tablesOnlyInProd.length > 0) {
              console.log('Tables uniquement en production:', tablesOnlyInProd);
            }
            
            const tablesOnlyInRecette = recetteTables.filter(table => !prodTables.includes(table));
            if (tablesOnlyInRecette.length > 0) {
              console.log('Tables uniquement en recette:', tablesOnlyInRecette);
            }
          }
        } else {
          console.log('Différences:', JSON.stringify(comparison.differences, null, 2));
        }
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
    
    // Générer les scripts de synchronisation
    console.log('\n=== GÉNÉRATION DES SCRIPTS DE SYNCHRONISATION ===');
    const syncScripts = generateSyncScripts(results);
    
    // Enregistrer les scripts dans des fichiers
    fs.writeFileSync('./sync-prod-to-recette.sql', syncScripts.prodToRecette);
    fs.writeFileSync('./sync-recette-to-prod.sql', syncScripts.recetteToProd);
    
    console.log('Scripts de synchronisation générés:');
    console.log('- sync-prod-to-recette.sql: Pour synchroniser la recette avec la production');
    console.log('- sync-recette-to-prod.sql: Pour synchroniser la production avec la recette');
    
    // Générer un rapport détaillé
    const reportPath = './specific-tables-comparison.json';
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
    
    console.log(`\nTotal: ${identicalCount + differentCount} éléments comparés`);
    console.log(`✅ Identiques: ${identicalCount}`);
    console.log(`❌ Différents: ${differentCount}`);
    
  } catch (err) {
    console.error('Erreur lors de la comparaison:', err);
  } finally {
    // Fermer les connexions
    await prodClient.end();
    await recetteClient.end();
  }
}

// Exécuter la comparaison
compareSpecificTables().catch(err => {
  console.error('Erreur globale:', err);
  process.exit(1);
});
