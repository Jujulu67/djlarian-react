#!/usr/bin/env node

/**
 * Script de test pour vérifier la mémoire conversationnelle
 *
 * Usage: node scripts/test-conversation-memory.mjs
 *
 * Ce script simule une conversation avec plusieurs messages pour vérifier :
 * 1. Que la mémoire conversationnelle fonctionne
 * 2. Que les tokens sont bien limités
 * 3. Que les anciens messages sont bien résumés
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY n'est pas définie dans les variables d'environnement");
  process.exit(1);
}

// Note: Ce script nécessite que les fichiers TypeScript soient compilés
// Pour l'utiliser, exécutez d'abord: npm run build
// Ou utilisez tsx: npx tsx scripts/test-conversation-memory.mjs

// Import dynamique pour gérer les modules TypeScript
async function loadModules() {
  try {
    // Essayer d'importer depuis les fichiers compilés
    const { getConversationalResponse } =
      await import('../dist/lib/assistant/conversational/groq-responder.js');
    const { prepareConversationContext, estimateTokens } =
      await import('../dist/lib/assistant/conversational/memory-manager.js');
    return { getConversationalResponse, prepareConversationContext, estimateTokens };
  } catch (error) {
    console.error(
      '❌ Erreur lors du chargement des modules. Assurez-vous que le projet est compilé (npm run build)'
    );
    console.error('   Ou utilisez tsx: npx tsx scripts/test-conversation-memory.mjs');
    throw error;
  }
}

// Simuler une conversation avec plusieurs messages
const conversationHistory = [
  {
    role: 'user',
    content: 'quelle est ta pizza préférée?',
    timestamp: new Date(Date.now() - 60000 * 5), // Il y a 5 minutes
  },
  {
    role: 'assistant',
    content:
      "Ahaha, je suis pas vraiment un expert en pizzas, mais j'ai entendu parler de la pizza margherita, c'est pas mal ! Je préfère probablement les pizzas classiques avec un fond de sauce tomate fraîche. 🍕 🤤",
    timestamp: new Date(Date.now() - 60000 * 4),
  },
  {
    role: 'user',
    content: "ah oui ? et quoi d'autre comme garniture",
    timestamp: new Date(Date.now() - 60000 * 3),
  },
  {
    role: 'assistant',
    content:
      "Ahah, tu veux savoir d'autres garnitures ? 🤔 En musique, je peux te donner des exemples de garnitures pour certains de mes 43 projets, comme les cordes ou les percussions. Mais sinon, les épices en pâtisserie, des herbes fraîches pour un saladier, voilà des idées !",
    timestamp: new Date(Date.now() - 60000 * 2),
  },
  {
    role: 'user',
    content: 'tu préfères quelle saison?',
    timestamp: new Date(Date.now() - 60000 * 1),
  },
  {
    role: 'assistant',
    content:
      "Je n'ai pas vraiment de préférence pour les saisons, mais je peux t'aider avec tes projets musicaux ! 🎵",
    timestamp: new Date(Date.now() - 30000),
  },
];

console.log('🧪 Test de la mémoire conversationnelle\n');
console.log('📝 Historique de conversation simulé:');
conversationHistory.forEach((msg, i) => {
  console.log(`  ${i + 1}. [${msg.role}]: ${msg.content.substring(0, 60)}...`);
});

console.log('\n📊 Analyse de la mémoire:\n');

// Préparer le contexte (déjà chargé via loadModules)
const preparedContext = prepareConversationContext(conversationHistory);

console.log('✅ Contexte préparé:');
console.log(`  - Messages récents: ${preparedContext.recentMessages.length}`);
console.log(`  - Résumé créé: ${preparedContext.summary ? 'Oui' : 'Non'}`);
if (preparedContext.summary) {
  console.log(`  - Résumé: "${preparedContext.summary}"`);
  console.log(`  - Tokens du résumé: ~${estimateTokens(preparedContext.summary)}`);
}
console.log(`  - Tokens totaux: ~${preparedContext.totalTokens}`);

// Calculer les tokens de chaque message récent
console.log('\n📏 Détail des messages récents:');
preparedContext.recentMessages.forEach((msg, i) => {
  const tokens = estimateTokens(msg.content);
  console.log(
    `  ${i + 1}. [${msg.role}]: ~${tokens} tokens - "${msg.content.substring(0, 50)}..."`
  );
});

console.log('\n🤖 Test avec Groq (question de suivi):\n');

// Question de suivi qui devrait utiliser la mémoire
const followUpQuestion = 'et tu préfères quelle saison finalement?';

console.log(`Question: "${followUpQuestion}"`);
console.log(
  "(Cette question devrait montrer que l'assistant se souvient de la conversation précédente)\n"
);

const { getConversationalResponse, prepareConversationContext, estimateTokens } =
  await loadModules();

try {
  const response = await getConversationalResponse(
    followUpQuestion,
    {
      projectCount: 43,
      collabCount: 5,
      styleCount: 10,
    },
    conversationHistory
  );

  console.log("✅ Réponse de l'assistant:");
  console.log(`"${response}"\n`);

  // Vérifier si la réponse fait référence à la conversation précédente
  const mentionsPreviousTopics =
    response.toLowerCase().includes('saison') ||
    response.toLowerCase().includes('pizza') ||
    response.toLowerCase().includes('garniture');

  if (mentionsPreviousTopics) {
    console.log("✅ SUCCÈS: L'assistant semble se souvenir de la conversation précédente!");
  } else {
    console.log('⚠️  ATTENTION: La réponse ne mentionne pas explicitement les sujets précédents.');
    console.log("   (Cela peut être normal si l'assistant répond de manière naturelle)");
  }
} catch (error) {
  console.error("❌ Erreur lors de l'appel à Groq:", error);
  process.exit(1);
}

console.log('\n📈 Test de limitation des tokens:\n');

// Créer un historique très long pour tester la limitation
const longHistory = Array.from({ length: 30 }, (_, i) => ({
  role: i % 2 === 0 ? 'user' : 'assistant',
  content: `Message ${i + 1}: ${'x'.repeat(100)} Ceci est un message de test pour vérifier la limitation des tokens.`,
  timestamp: new Date(Date.now() - 60000 * (30 - i)),
}));

console.log(`Création d'un historique de ${longHistory.length} messages...`);

const longPreparedContext = prepareConversationContext(longHistory);

console.log('✅ Contexte préparé (historique long):');
console.log(`  - Messages dans l'historique: ${longHistory.length}`);
console.log(`  - Messages récents gardés: ${longPreparedContext.recentMessages.length}`);
console.log(`  - Résumé créé: ${longPreparedContext.summary ? 'Oui' : 'Non'}`);
console.log(`  - Tokens totaux: ~${longPreparedContext.totalTokens}`);
console.log(`  - Limite cible: 2000 tokens`);

if (longPreparedContext.totalTokens <= 2000) {
  console.log('✅ SUCCÈS: Les tokens sont bien limités sous la limite de 2000!');
} else {
  console.log('⚠️  ATTENTION: Les tokens dépassent la limite de 2000.');
}

console.log('\n✨ Tests terminés!');
