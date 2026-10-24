#!/usr/bin/env node

/**
 * Script de test pour vérifier la classification des requêtes
 * Teste les patterns depuis test-assistant-questions.md
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Importer les fonctions de classification
// Note: On doit utiliser une approche différente car c'est du TypeScript
// On va créer un wrapper simple

const testCases = [
  // Questions générales (doivent appeler Groq, pas parser)
  { input: 'bonjour comment vas tu', expected: { understood: false, type: 'conversational' } },
  { input: 'salut ça va?', expected: { understood: false, type: 'conversational' } },
  { input: 'hey comment ça va?', expected: { understood: false, type: 'conversational' } },
  { input: 'hello how are you?', expected: { understood: false, type: 'conversational' } },
  { input: 'comment cuire une pizza?', expected: { understood: false, type: 'conversational' } },
  {
    input: "c'est quoi la capitale de la France?",
    expected: { understood: false, type: 'conversational' },
  },
  { input: 'dis moi une blague', expected: { understood: false, type: 'conversational' } },
  { input: 'raconte moi une histoire', expected: { understood: false, type: 'conversational' } },

  // Questions conversationnelles sur les projets (doivent appeler Groq)
  {
    input: "ok et concernant nos projets? Faut qu'on cook!",
    expected: { understood: false, type: 'conversational' },
  },
  {
    input: "ça fait une belle liste t'en penses quoi?",
    expected: { understood: false, type: 'conversational' },
  },
  { input: 'et nos projets alors?', expected: { understood: false, type: 'conversational' } },
  { input: 'alors pour nos projets?', expected: { understood: false, type: 'conversational' } },
  {
    input: "qu'est-ce que tu en penses de nos projets?",
    expected: { understood: false, type: 'conversational' },
  },
  {
    input: "t'en penses quoi de cette liste?",
    expected: { understood: false, type: 'conversational' },
  },
  { input: "c'est pas mal non?", expected: { understood: false, type: 'conversational' } },
  {
    input: 'ça fait beaucoup de projets tu trouves pas?',
    expected: { understood: false, type: 'conversational' },
  },
  { input: 'on a beaucoup bossé hein?', expected: { understood: false, type: 'conversational' } },
  { input: 'et maintenant on fait quoi?', expected: { understood: false, type: 'conversational' } },

  // Questions d'opinion/commentaires
  { input: "c'est cool non?", expected: { understood: false, type: 'conversational' } },
  { input: 'tu penses quoi?', expected: { understood: false, type: 'conversational' } },
  { input: "qu'est-ce que tu en penses?", expected: { understood: false, type: 'conversational' } },
  { input: "t'en penses quoi?", expected: { understood: false, type: 'conversational' } },
  { input: 'what do you think?', expected: { understood: false, type: 'conversational' } },
  { input: "c'est bien fait non?", expected: { understood: false, type: 'conversational' } },
  { input: 'ça te plaît?', expected: { understood: false, type: 'conversational' } },

  // Vraies commandes (doivent parser, pas appeler Groq)
  { input: 'liste moi les projets en cours', expected: { understood: true, type: 'list' } },
  { input: 'liste mes projets', expected: { understood: true, type: 'list' } },
  { input: 'montre moi tous les projets', expected: { understood: true, type: 'list' } },
  { input: 'affiche les projets terminés', expected: { understood: true, type: 'list' } },
  { input: 'list my projects', expected: { understood: true, type: 'list' } },
  { input: 'show me all projects', expected: { understood: true, type: 'list' } },
  { input: 'quels sont mes projets?', expected: { understood: true, type: 'list' } },
  { input: 'donne moi la liste des projets', expected: { understood: true, type: 'list' } },

  // Commandes de comptage
  { input: "combien de projets j'ai?", expected: { understood: true, type: 'count' } },
  { input: 'combien de projets sous les 70%?', expected: { understood: true, type: 'count' } },
  { input: 'nombre de projets terminés', expected: { understood: true, type: 'count' } },
  { input: 'how many projects do I have?', expected: { understood: true, type: 'count' } },
  { input: 'count projects under 50%', expected: { understood: true, type: 'count' } },
  { input: 'total de ghost prod', expected: { understood: true, type: 'count' } },

  // Commandes avec filtres
  { input: 'liste mes ghost prod', expected: { understood: true, type: 'list' } },
  { input: 'projets terminés', expected: { understood: true, type: 'list' } },
  { input: 'projets en cours', expected: { understood: true, type: 'list' } },
  { input: 'projets sous les 70%', expected: { understood: true, type: 'list' } },
  { input: 'projets avec collab X', expected: { understood: true, type: 'list' } },
  { input: 'projets en drum and bass', expected: { understood: true, type: 'list' } },
  { input: 'ghost production', expected: { understood: true, type: 'list' } },
  { input: 'projets annulés', expected: { understood: true, type: 'list' } },
  { input: 'projets archivés', expected: { understood: true, type: 'list' } },
  { input: 'projets à rework', expected: { understood: true, type: 'list' } },

  // Questions sur l'assistant (doivent appeler Groq)
  {
    input: 'quels sont tes projets dans la vie?',
    expected: { understood: false, type: 'conversational' },
  },
  { input: 'combien de projets tu as?', expected: { understood: false, type: 'conversational' } },
  { input: 'montre moi tes projets', expected: { understood: false, type: 'conversational' } },
  { input: 'liste tes projets terminés', expected: { understood: false, type: 'conversational' } },
  {
    input: 'quels sont les projets que tu gères?',
    expected: { understood: false, type: 'conversational' },
  },
  {
    input: 'combien de projets sans avancement tu as?',
    expected: { understood: false, type: 'conversational' },
  },
  { input: 'quels projets tu gères?', expected: { understood: false, type: 'conversational' } },
  { input: 'montre tes projets musicaux', expected: { understood: false, type: 'conversational' } },
  { input: 'liste les projets de toi', expected: { understood: false, type: 'conversational' } },
];

console.log('🧪 Test de classification des patterns\n');
console.log(`Total de cas de test: ${testCases.length}\n`);

// Pour tester, on doit utiliser le code TypeScript compilé ou créer un wrapper
// Pour l'instant, on va juste afficher les cas de test
console.log('Cas de test à vérifier:\n');

let passed = 0;
let failed = 0;
const failures = [];

for (const testCase of testCases) {
  console.log(`  ✓ ${testCase.input.substring(0, 50)}...`);
  // TODO: Appeler la vraie fonction de classification
  // Pour l'instant, on ne peut pas tester sans compiler le TypeScript
}

console.log(`\n✅ ${passed} passés, ❌ ${failed} échoués`);

if (failures.length > 0) {
  console.log('\n❌ Échecs:');
  failures.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.input}`);
    console.log(`     Attendu: ${JSON.stringify(f.expected)}`);
    console.log(`     Reçu: ${JSON.stringify(f.actual)}`);
  });
}

console.log(
  '\n💡 Pour tester réellement, il faut compiler le TypeScript et appeler les fonctions de classification.'
);
