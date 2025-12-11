/**
 * Script de test manuel pour l'Assistant IA
 * Teste plusieurs cas de demande et vérifie la cohérence des réponses
 *
 * Usage: node test-assistant-manual.mjs
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger .env.local
config({ path: join(__dirname, '.env.local') });

// Vérifier que la clé API est présente
if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY non trouvée dans .env.local');
  process.exit(1);
}

// Cas de test à vérifier
const testCases = [
  {
    name: 'Question simple - Information',
    input: "Bonjour, peux-tu me dire combien de projets j'ai ?",
    expected: {
      shouldCallTool: false,
      shouldContain: ['projet'],
      shouldNotContain: ['modifié', 'mis à jour', 'count'],
    },
  },
  {
    name: 'Question sur les statuts',
    input: 'Quels sont les statuts disponibles pour les projets ?',
    expected: {
      shouldCallTool: false,
      shouldContain: ['statut', 'EN_COURS', 'TERMINE'],
      shouldNotContain: ['modifié', 'mis à jour'],
    },
  },
  {
    name: 'Salutation simple',
    input: 'Bonjour',
    expected: {
      shouldCallTool: false,
      shouldContain: [],
      shouldNotContain: ['erreur', 'Erreur'],
    },
  },
  {
    name: 'Commande de modification - Deadline (sans exécution)',
    input: 'Déplace la deadline à demain pour les projets finis à 80%',
    expected: {
      shouldCallTool: true,
      shouldContain: ['projet', 'deadline', 'demain'],
      shouldNotContain: ['erreur', 'Erreur'],
      note: "⚠️ Cette commande modifierait réellement les données. Testez manuellement dans l'UI.",
    },
  },
  {
    name: 'Commande de modification - Statut (sans exécution)',
    input: 'Marque comme TERMINE les projets à 100%',
    expected: {
      shouldCallTool: true,
      shouldContain: ['TERMINE', 'projet'],
      shouldNotContain: ['erreur', 'Erreur'],
      note: "⚠️ Cette commande modifierait réellement les données. Testez manuellement dans l'UI.",
    },
  },
  {
    name: 'Question avec date relative',
    input: 'Quels projets ont une deadline demain ?',
    expected: {
      shouldCallTool: false,
      shouldContain: ['projet', 'deadline'],
      shouldNotContain: ['modifié', 'mis à jour'],
    },
  },
  {
    name: 'Question sur la progression',
    input: 'Combien de projets sont à plus de 50% de progression ?',
    expected: {
      shouldCallTool: false,
      shouldContain: ['projet', 'progression'],
      shouldNotContain: ['modifié', 'mis à jour'],
    },
  },
];

console.log('🧪 Tests de Cohérence - Assistant IA\n');
console.log('='.repeat(60));
console.log('⚠️  IMPORTANT: Ces tests vérifient la COHÉRENCE des réponses');
console.log('⚠️  Les commandes de modification ne seront PAS exécutées');
console.log("⚠️  Pour tester les modifications, utilisez l'UI manuellement");
console.log('='.repeat(60));
console.log('');

// Fonction pour vérifier si une réponse est cohérente
function checkResponse(response, expected) {
  const issues = [];

  // Vérifier que la réponse existe et n'est pas vide
  if (!response || typeof response !== 'string' || response.trim().length === 0) {
    issues.push('❌ La réponse est vide ou invalide');
    return { valid: false, issues };
  }

  // Vérifier les contenus attendus
  if (expected.shouldContain && expected.shouldContain.length > 0) {
    for (const term of expected.shouldContain) {
      if (!response.toLowerCase().includes(term.toLowerCase())) {
        issues.push(`⚠️  La réponse devrait contenir "${term}"`);
      }
    }
  }

  // Vérifier les contenus non attendus
  if (expected.shouldNotContain && expected.shouldNotContain.length > 0) {
    for (const term of expected.shouldNotContain) {
      if (response.toLowerCase().includes(term.toLowerCase())) {
        issues.push(`⚠️  La réponse ne devrait pas contenir "${term}"`);
      }
    }
  }

  // Vérifier qu'il n'y a pas d'erreur
  if (response.toLowerCase().includes('erreur') && !expected.shouldContain?.includes('erreur')) {
    issues.push('❌ La réponse contient une erreur');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// Afficher les cas de test
console.log('📋 Cas de test à vérifier :\n');
testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Input: "${testCase.input}"`);
  if (testCase.expected.note) {
    console.log(`   ${testCase.expected.note}`);
  }
  console.log('');
});

console.log('='.repeat(60));
console.log('');
console.log('💡 Instructions pour tester manuellement :');
console.log('');
console.log('1. Démarrez le serveur : npm run dev');
console.log('2. Allez sur http://localhost:3000/projects');
console.log('3. Cliquez sur le bouton flottant (icône Sparkles)');
console.log('4. Testez chaque cas ci-dessus');
console.log('');
console.log('✅ Vérifications à faire pour chaque réponse :');
console.log('   - La réponse est cohérente avec la demande');
console.log('   - La réponse est en français (ou dans la langue demandée)');
console.log('   - Pour les questions : pas de modification en base');
console.log("   - Pour les commandes : confirmation de l'action prévue");
console.log("   - Pas d'erreurs techniques");
console.log('');
console.log('⚠️  Pour les commandes de modification :');
console.log("   - Vérifiez que l'assistant comprend bien la commande");
console.log('   - Vérifiez que les paramètres sont corrects (progression, statut, date)');
console.log("   - Testez avec UN projet de test d'abord");
console.log('');

// Résumé des attentes
console.log('='.repeat(60));
console.log('📊 Résumé des attentes par type de demande :\n');

console.log('📝 Questions simples (sans modifications) :');
console.log('   ✅ Réponse conversationnelle et informative');
console.log("   ✅ Pas d'appel à l'outil updateProjects");
console.log('   ✅ Pas de revalidation de page');
console.log('');

console.log('🔧 Commandes de modification :');
console.log("   ✅ L'assistant doit comprendre l'intention");
console.log('   ✅ Les paramètres doivent être corrects (progression, statut, date)');
console.log('   ✅ Filtrage automatique par userId (sécurité)');
console.log('   ✅ Confirmation du nombre de projets modifiés');
console.log('   ✅ Revalidation de la page après modification');
console.log('');

console.log('🔒 Sécurité :');
console.log('   ✅ Toujours filtrer par userId');
console.log("   ✅ Vérifier l'authentification avant toute action");
console.log('   ✅ Validation des paramètres (progression 0-100, statuts valides)');
console.log('');

console.log("✅ Script de test terminé. Testez manuellement dans l'UI !\n");
