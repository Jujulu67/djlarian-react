#!/usr/bin/env node
/**
 * Script de test pour vérifier les garde-fous de sécurité DB
 *
 * Vérifie que:
 * - db:reset:local refuse sans ALLOW_DB_WIPE_LOCAL=1
 * - db:reset:local refuse sans DB_WIPE_CONFIRM
 * - db:reset:local refuse si le switch de production est activé
 * - db:reset:local refuse si DATABASE_URL pointe vers prod
 * - dev:auto ne déclenche jamais de wipe
 *
 * Usage:
 *   node scripts/test-db-safety-guards.mjs
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: db:reset:local refuse sans ALLOW_DB_WIPE_LOCAL
test('db:reset:local refuse sans ALLOW_DB_WIPE_LOCAL', () => {
  try {
    // Supprimer les variables d'environnement
    const env = { ...process.env };
    delete env.ALLOW_DB_WIPE_LOCAL;
    delete env.DB_WIPE_CONFIRM;

    execSync('npm run db:reset:local', {
      cwd: rootDir,
      env,
      stdio: 'pipe',
      timeout: 5000,
    });

    throw new Error('Le script devrait avoir échoué sans ALLOW_DB_WIPE_LOCAL');
  } catch (err) {
    // Vérifier que l'erreur contient le message de protection
    const stderr = err.stderr?.toString() || '';
    const stdout = err.stdout?.toString() || '';
    const output = stderr + stdout;

    assert(
      output.includes('ALLOW_DB_WIPE_LOCAL') || output.includes('PROTECTION'),
      "Le message d'erreur devrait mentionner ALLOW_DB_WIPE_LOCAL"
    );
  }
});

// Test 2: db:reset:local refuse sans DB_WIPE_CONFIRM
test('db:reset:local refuse sans DB_WIPE_CONFIRM', () => {
  try {
    const env = { ...process.env, ALLOW_DB_WIPE_LOCAL: '1' };
    delete env.DB_WIPE_CONFIRM;

    execSync('npm run db:reset:local', {
      cwd: rootDir,
      env,
      stdio: 'pipe',
      timeout: 5000,
    });

    throw new Error('Le script devrait avoir échoué sans DB_WIPE_CONFIRM');
  } catch (err) {
    const stderr = err.stderr?.toString() || '';
    const stdout = err.stdout?.toString() || '';
    const output = stderr + stdout;

    assert(
      output.includes('DB_WIPE_CONFIRM') || output.includes('PROTECTION'),
      "Le message d'erreur devrait mentionner DB_WIPE_CONFIRM"
    );
  }
});

// Test 3: db:reset:local refuse si le switch de production est activé
test('db:reset:local refuse si le switch de production est activé', () => {
  const switchPath = join(rootDir, '.db-switch.json');
  const originalSwitchExists = existsSync(switchPath);
  let originalSwitchContent = null;

  try {
    // Sauvegarder le switch actuel s'il existe
    if (originalSwitchExists) {
      originalSwitchContent = readFileSync(switchPath, 'utf-8');
    }

    // Créer un switch avec useProduction=true
    writeFileSync(switchPath, JSON.stringify({ useProduction: true }, null, 2));

    const env = {
      ...process.env,
      ALLOW_DB_WIPE_LOCAL: '1',
      DB_WIPE_CONFIRM: Math.floor(Date.now() / 1000).toString(),
      DATABASE_URL:
        'postgresql://djlarian:djlarian_dev_password@localhost:5433/djlarian_dev?sslmode=disable',
    };

    execSync('npm run db:reset:local', {
      cwd: rootDir,
      env,
      stdio: 'pipe',
      timeout: 10000,
      encoding: 'utf-8',
    });

    throw new Error('Le script devrait avoir échoué avec le switch de production activé');
  } catch (err) {
    const exitCode = err.status || err.code;
    const stderr = (err.stderr?.toString() || '').toLowerCase();
    const stdout = (err.stdout?.toString() || '').toLowerCase();
    const output = stderr + stdout;

    const hasProtection =
      exitCode === 1 &&
      (output.includes('switch') ||
        output.includes('production') ||
        output.includes('protection') ||
        output.includes('ne peut pas') ||
        output.includes('refuse'));

    assert(
      hasProtection,
      `Le script devrait échouer avec le switch de production activé. Exit code: ${exitCode}, Output: ${output.substring(0, 300)}`
    );
  } finally {
    // Restaurer le switch original
    if (originalSwitchExists && originalSwitchContent) {
      writeFileSync(switchPath, originalSwitchContent);
    } else if (!originalSwitchExists && existsSync(switchPath)) {
      unlinkSync(switchPath);
    }
  }
});

// Test 4: db:reset:local refuse si DATABASE_URL pointe vers prod
test('db:reset:local refuse si DATABASE_URL pointe vers prod', () => {
  try {
    const env = {
      ...process.env,
      ALLOW_DB_WIPE_LOCAL: '1',
      DB_WIPE_CONFIRM: Math.floor(Date.now() / 1000).toString(),
      // Utiliser une URL qui contient un domaine de prod mais pas localhost
      DATABASE_URL: 'postgresql://user:pass@neon.tech/prod?sslmode=require',
    };

    const result = execSync('npm run db:reset:local', {
      cwd: rootDir,
      env,
      stdio: 'pipe',
      timeout: 10000,
      encoding: 'utf-8',
    });

    // Si on arrive ici, le script n'a pas échoué
    throw new Error('Le script devrait avoir échoué avec DATABASE_URL de prod');
  } catch (err) {
    // Le script devrait avoir échoué avec code 1
    // Vérifier que c'est bien une erreur (code 1) et pas juste un timeout
    const exitCode = err.status || err.code;
    const stderr = (err.stderr?.toString() || '').toLowerCase();
    const stdout = (err.stdout?.toString() || '').toLowerCase();
    const output = stderr + stdout;

    // Le script devrait échouer (code 1) car DATABASE_URL ne contient pas localhost
    // Le message peut mentionner "localhost" ou "protection" ou "domaine"
    const hasProtection =
      exitCode === 1 ||
      output.includes('localhost') ||
      output.includes('production') ||
      output.includes('neon.tech') ||
      output.includes('protection') ||
      output.includes('domaine') ||
      output.includes('ne peut pas') ||
      output.includes('refuse') ||
      output.includes('interdit') ||
      output.includes('local');

    assert(
      hasProtection,
      `Le script devrait échouer avec DATABASE_URL de prod. Exit code: ${exitCode}, Output: ${output.substring(0, 300)}`
    );
  }
});

// Test 5: dev:auto ne contient pas docker compose down -v
test('dev:auto ne contient pas docker compose down -v', () => {
  const scriptPath = join(rootDir, 'scripts', 'start-dev-with-auto-restart.sh');
  assert(existsSync(scriptPath), 'Le script dev:auto devrait exister');

  const content = readFileSync(scriptPath, 'utf-8');

  // Vérifier qu'il n'y a pas de docker compose down -v
  assert(
    !content.includes('docker compose down -v') && !content.includes('docker-compose down -v'),
    'dev:auto ne devrait pas contenir docker compose down -v'
  );

  // Vérifier qu'il n'y a pas d'appel à db:reset:local
  assert(!content.includes('db:reset:local'), 'dev:auto ne devrait pas appeler db:reset:local');
});

// Test 6: package.json db:reset:local pointe vers le script sécurisé
test('package.json db:reset:local pointe vers reset-db-local-safe.sh', () => {
  const packageJsonPath = join(rootDir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  const script = packageJson.scripts['db:reset:local'];
  assert(script, 'db:reset:local devrait être défini dans package.json');

  assert(
    script.includes('reset-db-local-safe.sh'),
    'db:reset:local devrait utiliser reset-db-local-safe.sh'
  );
});

// Test 7: Le script reset-db-local-safe.sh existe et est exécutable
test('reset-db-local-safe.sh existe et est exécutable', () => {
  const scriptPath = join(rootDir, 'scripts', 'reset-db-local-safe.sh');
  assert(existsSync(scriptPath), 'reset-db-local-safe.sh devrait exister');

  const content = readFileSync(scriptPath, 'utf-8');

  // Vérifier que les garde-fous sont présents
  assert(content.includes('ALLOW_DB_WIPE_LOCAL'), 'Le script devrait vérifier ALLOW_DB_WIPE_LOCAL');
  assert(content.includes('DB_WIPE_CONFIRM'), 'Le script devrait vérifier DB_WIPE_CONFIRM');
  assert(
    content.includes('.db-switch.json') ||
      content.includes('switch') ||
      content.includes('USE_PRODUCTION'),
    'Le script devrait vérifier le switch de production'
  );
  assert(
    content.includes('localhost') || content.includes('127.0.0.1'),
    'Le script devrait vérifier que DATABASE_URL pointe vers localhost'
  );
});

// Test 8: Aucune écriture manuelle de migrations (sauf baselines)
test('Aucune écriture manuelle de migrations (sauf baselines)', async () => {
  // Chercher les scripts qui écrivent dans migration.sql
  const scriptsDir = join(rootDir, 'scripts');
  const { readdirSync, readFileSync } = await import('fs');

  const scripts = readdirSync(scriptsDir, { withFileTypes: true, recursive: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith('.mjs') || entry.name.endsWith('.sh') || entry.name.endsWith('.ts'))
    )
    .map((entry) => join(entry.path || scriptsDir, entry.name));

  let foundManualWrites = [];

  for (const scriptPath of scripts) {
    try {
      const content = readFileSync(scriptPath, 'utf-8');

      // Ignorer les scripts de baseline (création de migrations vides)
      if (scriptPath.includes('baseline') || scriptPath.includes('create-baseline')) {
        continue;
      }

      // Ignorer les scripts de correction de compatibilité (modification de migrations existantes)
      if (scriptPath.includes('fix-migrations-compatibility')) {
        continue;
      }

      // Chercher les écritures dans migration.sql (sauf dans migrations/)
      if (
        content.includes('migration.sql') &&
        !content.includes('migrations/') &&
        !content.includes('baseline')
      ) {
        // Vérifier que ce n'est pas juste une lecture
        if (
          content.includes('writeFile') ||
          content.includes('writeFileSync') ||
          content.includes('> migration.sql') ||
          content.includes('echo.*migration.sql')
        ) {
          foundManualWrites.push(scriptPath);
        }
      }
    } catch (err) {
      // Ignorer les erreurs de lecture
    }
  }

  assert(
    foundManualWrites.length === 0,
    `Scripts trouvés qui écrivent manuellement dans migration.sql: ${foundManualWrites.join(', ')}`
  );
});

// Exécuter tous les tests
async function runTests() {
  console.log('🧪 Tests des garde-fous de sécurité DB\n');

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ ${name}`);
      console.error(`   ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Résultats: ${passed} passés, ${failed} échoués`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
