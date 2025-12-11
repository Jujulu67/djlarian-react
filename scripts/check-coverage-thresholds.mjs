#!/usr/bin/env node

/**
 * Script pour vérifier que les seuils de coverage sont respectés
 * Utilisé uniquement en CI/CD, jamais en production sur Vercel
 *
 * Ce script lit le rapport de coverage JSON généré par Jest et vérifie
 * que tous les seuils sont respectés.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Seuils de coverage (doivent correspondre à jest.config.cjs)
const THRESHOLDS = {
  branches: 50,
  functions: 50,
  lines: 60,
  statements: 60,
};

// Chemin du rapport de coverage JSON
const coverageJsonPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');

function checkCoverage() {
  // Vérifier si le fichier de coverage existe
  if (!fs.existsSync(coverageJsonPath)) {
    console.error("❌ Fichier de coverage non trouvé. Exécutez d'abord: npm run test:coverage");
    process.exit(1);
  }

  // Lire le rapport de coverage
  const coverageData = JSON.parse(fs.readFileSync(coverageJsonPath, 'utf-8'));
  const globalCoverage = coverageData.total;

  if (!globalCoverage) {
    console.error('❌ Données de coverage globales non trouvées');
    process.exit(1);
  }

  // Vérifier chaque seuil
  let allThresholdsMet = true;
  const results = [];

  for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
    const actual = globalCoverage[metric]?.pct || 0;
    const met = actual >= threshold;

    results.push({
      metric,
      threshold,
      actual: actual.toFixed(2),
      met,
    });

    if (!met) {
      allThresholdsMet = false;
    }
  }

  // Afficher les résultats
  console.log('\n📊 Vérification des seuils de coverage:\n');
  console.log('┌─────────────┬───────────┬──────────┬─────────┐');
  console.log('│ Métrique    │ Seuil     │ Actuel   │ Status  │');
  console.log('├─────────────┼───────────┼──────────┼─────────┤');

  for (const result of results) {
    const status = result.met ? '✅ PASS' : '❌ FAIL';
    const actual = `${result.actual}%`;
    const threshold = `${result.threshold}%`;
    console.log(
      `│ ${result.metric.padEnd(11)} │ ${threshold.padEnd(9)} │ ${actual.padEnd(8)} │ ${status} │`
    );
  }

  console.log('└─────────────┴───────────┴──────────┴─────────┘\n');

  // Échouer si un seuil n'est pas atteint
  if (!allThresholdsMet) {
    console.error('❌ Les seuils de coverage ne sont pas tous atteints!');
    console.error('   Exécutez: npm run test:coverage pour voir les détails\n');
    process.exit(1);
  }

  console.log('✅ Tous les seuils de coverage sont respectés!\n');
  process.exit(0);
}

// Exécuter uniquement si on n'est pas en production sur Vercel
if (process.env.VERCEL === '1' && process.env.NODE_ENV === 'production') {
  console.log('⚠️  Skip coverage check en production sur Vercel');
  process.exit(0);
}

checkCoverage();
