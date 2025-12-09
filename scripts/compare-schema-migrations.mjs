#!/usr/bin/env node
/**
 * Script pour comparer le schéma Prisma avec les migrations existantes
 * Identifie les colonnes, tables, index et relations manquants
 * 
 * Usage: node scripts/compare-schema-migrations.mjs
 */

import { readFileSync, existsSync, readdir } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const readdirAsync = promisify(readdir);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const schemaPath = join(rootDir, 'prisma', 'schema.prisma');
const migrationsDir = join(rootDir, 'prisma', 'migrations');

// Parser simple du schéma Prisma
function parseSchema(schemaContent) {
  const models = {};
  let currentModel = null;
  let inModel = false;
  
  const lines = schemaContent.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Détecter le début d'un modèle
    if (line.startsWith('model ')) {
      const modelName = line.match(/model\s+(\w+)/)?.[1];
      if (modelName) {
        currentModel = modelName;
        models[currentModel] = {
          fields: [],
          indexes: [],
          uniqueConstraints: [],
          relations: []
        };
        inModel = true;
      }
      continue;
    }
    
    // Détecter la fin d'un modèle
    if (line === '}' && inModel) {
      inModel = false;
      currentModel = null;
      continue;
    }
    
    if (!inModel || !currentModel) continue;
    
    // Parser les champs
    if (line.match(/^\w+\s+[\w\[\]?]+/)) {
      const fieldMatch = line.match(/^(\w+)\s+([\w\[\]?]+)/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        const isOptional = line.includes('?');
        const isArray = fieldType.includes('[]');
        const hasDefault = line.includes('@default');
        
        // Extraire la valeur par défaut
        let defaultValue = null;
        const defaultMatch = line.match(/@default\(([^)]+)\)/);
        if (defaultMatch) {
          defaultValue = defaultMatch[1];
        }
        
        models[currentModel].fields.push({
          name: fieldName,
          type: fieldType.replace('[]', ''),
          optional: isOptional,
          array: isArray,
          defaultValue: defaultValue
        });
      }
    }
    
    // Parser les index
    if (line.includes('@@index')) {
      const indexMatch = line.match(/@@index\(\[([^\]]+)\]/);
      if (indexMatch) {
        const fields = indexMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
        models[currentModel].indexes.push(fields);
      }
    }
    
    // Parser les contraintes uniques
    if (line.includes('@@unique')) {
      const uniqueMatch = line.match(/@@unique\(\[([^\]]+)\]/);
      if (uniqueMatch) {
        const fields = uniqueMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
        models[currentModel].uniqueConstraints.push(fields);
      }
    }
    
    // Parser les relations (simplifié)
    if (line.includes('@relation')) {
      const relationMatch = line.match(/@relation\(fields:\s*\[(\w+)\]/);
      if (relationMatch) {
        models[currentModel].relations.push(relationMatch[1]);
      }
    }
  }
  
  return models;
}

// Parser simple des migrations SQL
function parseMigration(migrationContent) {
  const tables = {};
  const columns = {};
  const indexes = {};
  const constraints = {};
  
  // Extraire les CREATE TABLE
  const createTableRegex = /CREATE TABLE\s+"?(\w+)"?\s*\(([\s\S]*?)\);/g;
  let match;
  
  while ((match = createTableRegex.exec(migrationContent)) !== null) {
    const tableName = match[1];
    const tableDef = match[2];
    
    tables[tableName] = true;
    columns[tableName] = [];
    
    // Extraire les colonnes
    const columnLines = tableDef.split(',').map(l => l.trim());
    for (const line of columnLines) {
      const colMatch = line.match(/"(\w+)"\s+([A-Z\s()]+)/);
      if (colMatch) {
        columns[tableName].push(colMatch[1]);
      }
    }
  }
  
  // Extraire les ALTER TABLE ADD COLUMN
  const alterTableRegex = /ALTER TABLE\s+"?(\w+)"?\s+ADD COLUMN\s+"?(\w+)"?/gi;
  while ((match = alterTableRegex.exec(migrationContent)) !== null) {
    const tableName = match[1];
    const columnName = match[2];
    
    if (!columns[tableName]) {
      columns[tableName] = [];
    }
    columns[tableName].push(columnName);
  }
  
  // Extraire les CREATE INDEX
  const createIndexRegex = /CREATE (?:UNIQUE\s+)?INDEX\s+"?(\w+)"?\s+ON\s+"?(\w+)"?\s*\(([^)]+)\)/gi;
  while ((match = createIndexRegex.exec(migrationContent)) !== null) {
    const indexName = match[1];
    const tableName = match[2];
    const fields = match[3].split(',').map(f => f.trim().replace(/"/g, ''));
    
    if (!indexes[tableName]) {
      indexes[tableName] = [];
    }
    indexes[tableName].push({ name: indexName, fields });
  }
  
  return { tables, columns, indexes, constraints };
}

async function main() {
  console.log('🔍 Comparaison du schéma Prisma avec les migrations\n');
  
  // Lire le schéma
  if (!existsSync(schemaPath)) {
    console.error('❌ schema.prisma introuvable');
    process.exit(1);
  }
  
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const schemaModels = parseSchema(schemaContent);
  
  console.log(`📋 Modèles trouvés dans le schéma: ${Object.keys(schemaModels).length}\n`);
  
  // Lire toutes les migrations
  if (!existsSync(migrationsDir)) {
    console.error('❌ Dossier migrations introuvable');
    process.exit(1);
  }
  
  const entries = await readdirAsync(migrationsDir, { withFileTypes: true });
  const migrationDirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name)
    .sort();
  
  console.log(`📁 Migrations trouvées: ${migrationDirs.length}\n`);
  
  // Parser toutes les migrations
  const allMigrations = {
    tables: {},
    columns: {},
    indexes: {}
  };
  
  for (const migrationDir of migrationDirs) {
    const migrationPath = join(migrationsDir, migrationDir, 'migration.sql');
    if (existsSync(migrationPath)) {
      const migrationContent = readFileSync(migrationPath, 'utf-8');
      const parsed = parseMigration(migrationContent);
      
      // Fusionner les résultats
      Object.assign(allMigrations.tables, parsed.tables);
      
      for (const [table, cols] of Object.entries(parsed.columns)) {
        if (!allMigrations.columns[table]) {
          allMigrations.columns[table] = [];
        }
        allMigrations.columns[table].push(...cols);
      }
      
      for (const [table, idxs] of Object.entries(parsed.indexes)) {
        if (!allMigrations.indexes[table]) {
          allMigrations.indexes[table] = [];
        }
        allMigrations.indexes[table].push(...idxs);
      }
    }
  }
  
  // Comparer
  console.log('🔍 Analyse des différences:\n');
  
  const missingColumns = [];
  const missingIndexes = [];
  const missingTables = [];
  
  for (const [modelName, model] of Object.entries(schemaModels)) {
    // Vérifier si la table existe
    if (!allMigrations.tables[modelName]) {
      missingTables.push(modelName);
      continue;
    }
    
    // Vérifier les colonnes
    const migrationColumns = allMigrations.columns[modelName] || [];
    for (const field of model.fields) {
      // Ignorer les champs de relation (ceux qui sont des arrays ou qui ont @relation)
      if (field.array || field.type.includes('[]')) {
        continue;
      }
      
      // Ignorer les types qui sont des modèles Prisma (relations)
      // Les types de base sont: String, Int, Boolean, DateTime, Float, Json
      const isRelationType = !['String', 'Int', 'Integer', 'Boolean', 'DateTime', 'Float', 'Double', 'Json', 'JsonB'].includes(field.type);
      if (isRelationType) {
        continue;
      }
      
      // Vérifier si la colonne existe dans les migrations
      if (!migrationColumns.includes(field.name)) {
        missingColumns.push({
          table: modelName,
          column: field.name,
          type: field.type,
          optional: field.optional,
          defaultValue: field.defaultValue
        });
      }
    }
    
    // Vérifier les index
    const migrationIndexes = allMigrations.indexes[modelName] || [];
    for (const indexFields of model.indexes) {
      // Vérifier si un index avec ces champs existe
      const indexExists = migrationIndexes.some(idx => 
        idx.fields.length === indexFields.length &&
        idx.fields.every((f, i) => f === indexFields[i])
      );
      
      if (!indexExists) {
        missingIndexes.push({
          table: modelName,
          fields: indexFields
        });
      }
    }
  }
  
  // Afficher les résultats
  if (missingTables.length > 0) {
    console.log('❌ Tables manquantes dans les migrations:');
    missingTables.forEach(t => console.log(`   - ${t}`));
    console.log('');
  }
  
  if (missingColumns.length > 0) {
    console.log('❌ Colonnes manquantes dans les migrations:');
    missingColumns.forEach(c => {
      console.log(`   - ${c.table}.${c.column} (${c.type}${c.optional ? '?' : ''})`);
      if (c.defaultValue) {
        console.log(`     Default: ${c.defaultValue}`);
      }
    });
    console.log('');
  }
  
  if (missingIndexes.length > 0) {
    console.log('⚠️  Index manquants dans les migrations:');
    missingIndexes.forEach(i => {
      console.log(`   - ${i.table}: [${i.fields.join(', ')}]`);
    });
    console.log('');
  }
  
  if (missingTables.length === 0 && missingColumns.length === 0 && missingIndexes.length === 0) {
    console.log('✅ Aucune différence trouvée ! Le schéma est aligné avec les migrations.\n');
  } else {
    console.log('📊 Résumé:');
    console.log(`   Tables manquantes: ${missingTables.length}`);
    console.log(`   Colonnes manquantes: ${missingColumns.length}`);
    console.log(`   Index manquants: ${missingIndexes.length}\n`);
    
    // Générer le SQL pour les colonnes manquantes
    if (missingColumns.length > 0) {
      console.log('💡 SQL à générer pour les colonnes manquantes:\n');
      const groupedByTable = {};
      missingColumns.forEach(c => {
        if (!groupedByTable[c.table]) {
          groupedByTable[c.table] = [];
        }
        groupedByTable[c.table].push(c);
      });
      
      for (const [table, cols] of Object.entries(groupedByTable)) {
        console.log(`-- Migration pour ${table}:`);
        for (const col of cols) {
          let sqlType = 'TEXT';
          if (col.type === 'Int' || col.type === 'Integer') {
            sqlType = 'INTEGER';
          } else if (col.type === 'Boolean') {
            sqlType = 'BOOLEAN';
          } else if (col.type === 'DateTime') {
            sqlType = 'TIMESTAMP(3)';
          } else if (col.type === 'Float') {
            sqlType = 'DOUBLE PRECISION';
          }
          
          const nullable = col.optional ? '' : ' NOT NULL';
          let defaultValue = '';
          if (col.defaultValue) {
            if (col.defaultValue === 'now()') {
              defaultValue = ' DEFAULT CURRENT_TIMESTAMP';
            } else if (col.defaultValue === 'cuid()' || col.defaultValue === 'uuid()') {
              // Pas de default pour les IDs générés
            } else {
              defaultValue = ` DEFAULT ${col.defaultValue}`;
            }
          } else if (!col.optional && col.type === 'Boolean') {
            defaultValue = ' DEFAULT false';
          } else if (!col.optional && col.type === 'Int') {
            defaultValue = ' DEFAULT 0';
          }
          
          console.log(`ALTER TABLE "${table}" ADD COLUMN "${col.column}" ${sqlType}${nullable}${defaultValue};`);
        }
        console.log('');
      }
    }
  }
  
  // Retourner les résultats pour utilisation externe
  return {
    missingTables,
    missingColumns,
    missingIndexes
  };
}

main().catch(console.error);

