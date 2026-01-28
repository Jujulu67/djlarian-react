#!/usr/bin/env node

/**
 * Script d'audit de sécurité pour le projet Larian
 * Vérifie les vulnérabilités des dépendances et génère un rapport
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔒 Audit de Sécurité - Larian\n');
console.log('='.repeat(60));

// 1. Audit npm
console.log('\n📦 1. Audit des dépendances npm...\n');
try {
  const auditOutput = execSync('pnpm audit --json', { encoding: 'utf-8' });
  const audit = JSON.parse(auditOutput);

  const vulnerabilities = audit.vulnerabilities || {};
  const critical = Object.values(vulnerabilities).filter(v => v.severity === 'critical').length;
  const high = Object.values(vulnerabilities).filter(v => v.severity === 'high').length;
  const moderate = Object.values(vulnerabilities).filter(v => v.severity === 'moderate').length;
  const low = Object.values(vulnerabilities).filter(v => v.severity === 'low').length;

  console.log(`   ✅ Vulnérabilités trouvées:`);
  console.log(`      - Critique: ${critical}`);
  console.log(`      - Haute: ${high}`);
  console.log(`      - Modérée: ${moderate}`);
  console.log(`      - Faible: ${low}`);

  if (critical > 0 || high > 0) {
    console.log(`\n   ⚠️  ATTENTION: Vulnérabilités critiques/haute détectées!`);
    console.log(`      Exécutez: pnpm audit fix`);
  }

  // Lister les vulnérabilités critiques/haute
  if (critical > 0 || high > 0) {
    console.log(`\n   📋 Vulnérabilités critiques/haute:`);
    Object.entries(vulnerabilities).forEach(([name, vuln]) => {
      if (vuln.severity === 'critical' || vuln.severity === 'high') {
        console.log(`      - ${name}: ${vuln.severity}`);
        if (vuln.via && vuln.via.length > 0) {
          vuln.via.forEach(via => {
            if (typeof via === 'object' && via.title) {
              console.log(`        → ${via.title}`);
            }
          });
        }
      }
    });
  }
} catch (error) {
  console.error('   ❌ Erreur lors de l\'audit npm:', error.message);
}

// 2. Vérifier les versions obsolètes
console.log('\n📋 2. Vérification des versions obsolètes...\n');
try {
  const outdated = execSync('pnpm outdated --json', { encoding: 'utf-8' });
  const outdatedPackages = JSON.parse(outdated);
  const count = Object.keys(outdatedPackages).length;

  if (count > 0) {
    console.log(`   ⚠️  ${count} package(s) obsolète(s):`);
    Object.entries(outdatedPackages).forEach(([name, info]) => {
      console.log(`      - ${name}: ${info.current} → ${info.latest}`);
    });
  } else {
    console.log('   ✅ Tous les packages sont à jour');
  }
} catch (error) {
  // pnpm outdated retourne un code d'erreur si des packages sont obsolètes
  if (error.status === 1) {
    const outdated = JSON.parse(error.stdout || '{}');
    const count = Object.keys(outdated).length;
    if (count > 0) {
      console.log(`   ⚠️  ${count} package(s) obsolète(s):`);
      Object.entries(outdated).forEach(([name, info]) => {
        console.log(`      - ${name}: ${info.current} → ${info.latest}`);
      });
    }
  } else {
    console.log('   ✅ Tous les packages sont à jour');
  }
}

// 3. Vérifier les dépendances critiques
console.log('\n🔐 3. Vérification des dépendances critiques...\n');
const criticalDeps = {
  'next': 'Framework principal - vulnérabilités critiques possibles',
  'next-auth': 'Authentification - gestion des secrets critiques',
  '@prisma/client': 'ORM - protection SQL injection',
  'bcryptjs': 'Hashage des mots de passe - sécurité critique',
  'zod': 'Validation des entrées - protection injection',
};

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

Object.entries(criticalDeps).forEach(([dep, description]) => {
  if (allDeps[dep]) {
    console.log(`   ✅ ${dep}: ${allDeps[dep]} - ${description}`);
  } else {
    console.log(`   ⚠️  ${dep}: Non trouvé`);
  }
});

// 4. Vérifier les variables d'environnement critiques
console.log('\n🔑 4. Vérification des variables d'environnement...\n');
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  const requiredVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'DATABASE_URL',
  ];

  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`   ✅ ${varName}: Défini`);
    } else {
      console.log(`   ⚠️  ${varName}: MANQUANT`);
    }
  });
} else {
  console.log('   ⚠️  .env.local non trouvé');
}

console.log('\n' + '='.repeat(60));
console.log('✅ Audit terminé\n');

