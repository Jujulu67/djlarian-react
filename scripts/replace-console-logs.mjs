#!/usr/bin/env node

/**
 * Script pour remplacer automatiquement tous les console.log/warn/error
 * par le système de logging centralisé (logger)
 * 
 * Usage: node scripts/replace-console-logs.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Fichiers à exclure (système de logging lui-même)
const excludeFiles = [
  'src/lib/console-filters.ts',
  'src/lib/logger.ts',
];

// Fonction pour lire un fichier
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Erreur lecture ${filePath}:`, error.message);
    return null;
  }
}

// Fonction pour écrire un fichier
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Erreur écriture ${filePath}:`, error.message);
    return false;
  }
}

// Fonction pour vérifier si un fichier a déjà l'import logger
function hasLoggerImport(content) {
  return content.includes("import { logger } from '@/lib/logger'") ||
         content.includes('import { logger } from "@/lib/logger"') ||
         content.includes("from '@/lib/logger'") ||
         content.includes('from "@/lib/logger"');
}

// Fonction pour ajouter l'import logger
function addLoggerImport(content, filePath) {
  if (hasLoggerImport(content)) {
    return content;
  }

  // Trouver la dernière ligne d'import
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    } else if (lastImportIndex >= 0 && lines[i].trim() === '' && i > lastImportIndex + 1) {
      break;
    }
  }

  if (lastImportIndex >= 0) {
    // Ajouter l'import après le dernier import
    const importLine = "import { logger } from '@/lib/logger';";
    lines.splice(lastImportIndex + 1, 0, importLine);
    return lines.join('\n');
  } else {
    // Pas d'import trouvé, ajouter au début
    return `import { logger } from '@/lib/logger';\n${content}`;
  }
}

// Fonction pour remplacer les console.log/warn/error
function replaceConsoleLogs(content) {
  let modified = content;

  // Remplacer console.log par logger.debug (ou logger.info selon le contexte)
  modified = modified.replace(/console\.log\(/g, 'logger.debug(');
  
  // Remplacer console.warn par logger.warn
  modified = modified.replace(/console\.warn\(/g, 'logger.warn(');
  
  // Remplacer console.error par logger.error
  modified = modified.replace(/console\.error\(/g, 'logger.error(');
  
  // Remplacer console.info par logger.info
  modified = modified.replace(/console\.info\(/g, 'logger.info(');
  
  // Remplacer console.debug par logger.debug
  modified = modified.replace(/console\.debug\(/g, 'logger.debug(');

  return modified;
}

// Fonction principale
function processFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { success: false, reason: 'File not found' };
  }

  const content = readFile(fullPath);
  if (!content) {
    return { success: false, reason: 'Could not read file' };
  }

  // Vérifier si le fichier contient des console.log/warn/error
  if (!content.match(/console\.(log|warn|error|info|debug)\(/)) {
    return { success: true, reason: 'No console logs found', skipped: true };
  }

  // Ajouter l'import logger si nécessaire
  let modified = addLoggerImport(content, filePath);
  
  // Remplacer les console.log/warn/error
  modified = replaceConsoleLogs(modified);

  // Écrire le fichier modifié
  if (writeFile(fullPath, modified)) {
    return { success: true, reason: 'Updated' };
  } else {
    return { success: false, reason: 'Could not write file' };
  }
}

// Trouver tous les fichiers TypeScript/JavaScript dans src
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(projectRoot, filePath);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignorer node_modules et .next
      if (!file.startsWith('.') && file !== 'node_modules') {
        findFiles(filePath, fileList);
      }
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) 
               && !excludeFiles.includes(relativePath)) {
      fileList.push(relativePath);
    }
  });

  return fileList;
}

// Exécuter le script
console.log('🔍 Recherche des fichiers avec console.log/warn/error...\n');

const srcDir = path.join(projectRoot, 'src');
const files = findFiles(srcDir);

console.log(`📁 ${files.length} fichiers trouvés\n`);

let processed = 0;
let updated = 0;
let skipped = 0;
let errors = 0;

files.forEach(file => {
  const result = processFile(file);
  processed++;
  
  if (result.success) {
    if (result.skipped) {
      skipped++;
    } else {
      updated++;
      console.log(`✅ ${file}`);
    }
  } else {
    errors++;
    console.error(`❌ ${file}: ${result.reason}`);
  }
});

console.log(`\n📊 Résumé:`);
console.log(`   ✅ Mis à jour: ${updated}`);
console.log(`   ⏭️  Ignorés: ${skipped}`);
console.log(`   ❌ Erreurs: ${errors}`);
console.log(`   📝 Total: ${processed}`);

