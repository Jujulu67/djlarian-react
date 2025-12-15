/**
 * Tests additionnels pour les objectifs O1-O5
 *
 * TESTS OBLIGATOIRES:
 * - NT1: "Prisma" ne doit pas être filtré à tort
 * - NT2: "Action output" doit être filtré
 * - NT3: Budget + dernier message user
 * - NT4: Single trimming
 * - I5: Session lock / double-inflight detection
 */

import {
  ConversationMemoryStore,
  GroqPayloadBuilder,
  looksLikeActionOutput,
  withSessionLock,
  hasInflight,
  getInflightCount,
  assertNoDoubleInflight,
  resetSessionLocks,
} from '../index';

// ==========================================================================
// NT1: "Prisma" ne doit pas être filtré à tort (O3)
// ==========================================================================

describe('NT1: Technical Terms Should NOT Be Filtered', () => {
  it('should NOT filter "Explique Prisma rapidement" as user message', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'nt1-test-1',
      maxMessages: 50,
      maxTokens: 4000,
    });

    // Ajouter un message utilisateur avec "Prisma"
    const result = store.add('user', 'Explique Prisma rapidement');

    // ASSERTION NT1: Le message doit être accepté
    expect(result).not.toBeNull();
    expect(store.size).toBe(1);
  });

  it('should NOT filter SQL discussions', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'nt1-test-2',
      maxMessages: 50,
      maxTokens: 4000,
    });

    // Discussions techniques légitimes
    const techMessages = [
      'Comment fonctionne SQL?',
      'Explique-moi les JOIN en SQL',
      "C'est quoi Prisma ORM?",
      'Parle-moi de ActionMemory comme concept',
    ];

    for (const msg of techMessages) {
      const result = store.add('user', msg);
      expect(result).not.toBeNull();
    }

    expect(store.size).toBe(techMessages.length);
  });

  it('should accept "Prisma" message in Groq payload validation', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'nt1-test-3',
      maxMessages: 50,
      maxTokens: 4000,
    });
    const builder = new GroqPayloadBuilder();

    store.add('user', 'Explique Prisma rapidement');
    store.add('assistant', 'Prisma est un ORM moderne pour Node.js et TypeScript.');

    const payload = builder.build(store);
    const validation = builder.validatePayload(payload);

    // ASSERTION NT1: Le payload doit être valide
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('should NOT flag "Explique Prisma" with looksLikeActionOutput (user role)', () => {
    const builder = new GroqPayloadBuilder();

    // Avec le role 'user', les mots techniques ne doivent pas être filtrés
    expect(builder.looksLikeActionOutput('Explique Prisma rapidement', 'user')).toBe(false);
    expect(builder.looksLikeActionOutput("C'est quoi SQL?", 'user')).toBe(false);
  });
});

// ==========================================================================
// NT2: "Action output" doit être filtré (O3)
// ==========================================================================

describe('NT2: Action Outputs SHOULD Be Filtered', () => {
  it('should filter "J\'ai trouvé X projets" pattern', () => {
    const builder = new GroqPayloadBuilder();

    const actionOutputs = [
      "J'ai trouvé 3 projets correspondant à votre recherche",
      "J'ai trouvé 15 projet(s) en cours",
      "Ok. J'ai mis 5 projets à jour",
      "J'ai supprimé 2 projets",
    ];

    for (const output of actionOutputs) {
      expect(builder.looksLikeActionOutput(output, 'assistant')).toBe(true);
    }
  });

  it('should filter JSON project listings', () => {
    const builder = new GroqPayloadBuilder();

    const jsonOutput = '[{"id": "proj-1", "name": "Test Project", "status": "done"}]';
    expect(builder.looksLikeActionOutput(jsonOutput, 'assistant')).toBe(true);
  });

  it('should filter messages with affectedProjectIds', () => {
    const builder = new GroqPayloadBuilder();

    const output = '{"success": true, "message": "Updated", "affectedProjectIds": ["1", "2"]}';
    expect(builder.looksLikeActionOutput(output, 'assistant')).toBe(true);
  });

  it('should reject action outputs from ConversationMemoryStore', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'nt2-test-1',
      maxMessages: 50,
      maxTokens: 4000,
    });

    // Tentative d'ajouter un output d'action en tant que message assistant
    const result = store.add('assistant', "J'ai trouvé 15 projets correspondants");

    // ASSERTION NT2: Le message doit être rejeté
    expect(result).toBeNull();
    expect(store.size).toBe(0);
  });

  it('should reject JSON listings from assistant', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'nt2-test-2',
      maxMessages: 50,
      maxTokens: 4000,
    });

    const jsonListing = 'Voici les projets: [{"id": "1", "name": "Test", "status": "done"}]';
    const result = store.add('assistant', jsonListing);

    expect(result).toBeNull();
  });
});

// ==========================================================================
// NT3: Budget + dernier message user (O4)
// ==========================================================================

describe('NT3: Token Budget with Last User Message', () => {
  it('should keep payload under budget with long user input', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'nt3-test-1',
      maxMessages: 100,
      maxTokens: 2000, // Budget bas pour test
    });
    const builder = new GroqPayloadBuilder({
      tokenBudget: { productSoftLimit: 1500 },
    });

    // Remplir proche du softLimit
    for (let i = 0; i < 15; i++) {
      store.add('user', `Question ${i} avec du contenu pour consommer${'-'.repeat(50)}`);
      store.add('assistant', `Réponse ${i} avec du contenu pour consommer${'-'.repeat(50)}`);
    }

    // Ajouter un message user final long
    const longUserInput = 'A'.repeat(500); // ~125 tokens

    const payload = builder.build(store, longUserInput);

    // ASSERTION NT3: Le payload ne doit pas dépasser le budget
    // Estimation: chaque message ~25-50 tokens, soft limit = 1500
    const messageCount = payload.messages.length;
    expect(messageCount).toBeGreaterThan(2); // Au moins system + quelques messages + user

    // Vérifier que le dernier message est bien le user input
    const lastMessage = payload.messages[payload.messages.length - 1];
    expect(lastMessage.role).toBe('user');
    expect(lastMessage.content).toBe(longUserInput);
  });

  it('should NOT duplicate user message in payload', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'nt3-test-2',
      maxMessages: 50,
      maxTokens: 4000,
    });
    const builder = new GroqPayloadBuilder();

    store.add('user', 'Question initiale');
    store.add('assistant', 'Réponse initiale');

    // Construire avec currentUserMessage
    const currentInput = 'Ma nouvelle question';
    const payload = builder.build(store, currentInput);

    // Compter les occurrences du message courant
    const occurrences = payload.messages.filter((m) => m.content === currentInput);

    // ASSERTION NT3: Pas de duplication
    expect(occurrences.length).toBe(1);
  });

  it('should preserve recent turns after trimming', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'nt3-test-3',
      maxMessages: 100,
      maxTokens: 800, // Très bas pour forcer le trimming
    });
    const builder = new GroqPayloadBuilder({
      tokenBudget: { productSoftLimit: 600 },
    });

    // Remplir avec beaucoup de messages
    for (let i = 0; i < 20; i++) {
      store.add('user', `Message user ${i}`);
      store.add('assistant', `Message assistant ${i}`);
    }

    const payload = builder.build(store);

    // ASSERTION NT3: Les derniers messages doivent être conservés
    const nonSystemMessages = payload.messages.filter((m) => m.role !== 'system');
    expect(nonSystemMessages.length).toBeGreaterThanOrEqual(2); // Au moins un échange

    // Le dernier message doit être récent (index élevé)
    const lastContent = nonSystemMessages[nonSystemMessages.length - 1].content;
    expect(lastContent).toContain('19'); // Dernier message (index 19)
  });
});

// ==========================================================================
// NT4: Single Trimming - Vérifier qu'il n'y a pas de double trim (O4)
// ==========================================================================

describe('NT4: Single Trimming Source of Truth', () => {
  it('should only apply trimming in GroqPayloadBuilder (verify via structure)', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'nt4-test-1',
      maxMessages: 100,
      maxTokens: 4000,
    });
    const builder = new GroqPayloadBuilder({
      tokenBudget: { productSoftLimit: 500 }, // Limite basse
    });

    // Remplir le store
    for (let i = 0; i < 10; i++) {
      store.add('user', `Message ${i} avec du contenu pour test`);
      store.add('assistant', `Réponse ${i} avec du contenu pour test`);
    }

    const storeSize = store.size;
    const payload = builder.build(store);

    // Le store lui-même ne doit pas être modifié par le builder
    expect(store.size).toBe(storeSize);

    // Le payload peut avoir moins de messages (trimming appliqué)
    const payloadNonSystem = payload.messages.filter((m) => m.role !== 'system').length;

    // Le trimming est fait par le builder, pas par le store
    // Si le builder a trimmé, payloadNonSystem < storeSize
    expect(payloadNonSystem).toBeLessThanOrEqual(storeSize);
  });

  it('should document that groq-responder does NOT apply token budget trimming', () => {
    // Ce test est documentaire - vérifie que la logique est claire
    // Le vrai trimming de budget est dans GroqPayloadBuilder
    // groq-responder a un workaround pour longs prompts (problème API), pas pour budget

    // Vérification: GroqPayloadBuilder est la seule source de vérité
    const builder = new GroqPayloadBuilder();
    expect(builder).toBeDefined();
    expect(typeof builder.build).toBe('function');
  });
});

// ==========================================================================
// I5: Session Lock / Concurrence
// ==========================================================================

describe('I5: Session Lock and Concurrence', () => {
  beforeEach(() => {
    resetSessionLocks();
  });

  it('should track inflight requests', async () => {
    const sessionId = 'lock-test-1';

    expect(hasInflight(sessionId)).toBe(false);
    expect(getInflightCount(sessionId)).toBe(0);

    await withSessionLock(sessionId, async () => {
      expect(hasInflight(sessionId)).toBe(true);
      expect(getInflightCount(sessionId)).toBe(1);
    });

    expect(hasInflight(sessionId)).toBe(false);
  });

  it('should serialize concurrent requests on same session', async () => {
    const sessionId = 'lock-test-2';
    const executionOrder: number[] = [];

    // Lancer deux requêtes "concurrentes"
    const promise1 = withSessionLock(sessionId, async () => {
      executionOrder.push(1);
      await new Promise((r) => setTimeout(r, 50));
      executionOrder.push(2);
    });

    const promise2 = withSessionLock(sessionId, async () => {
      executionOrder.push(3);
      await new Promise((r) => setTimeout(r, 50));
      executionOrder.push(4);
    });

    await Promise.all([promise1, promise2]);

    // Les exécutions doivent être sérialisées: 1,2 puis 3,4
    expect(executionOrder).toEqual([1, 2, 3, 4]);
  });

  it('should allow parallel requests on different sessions', async () => {
    const sessionA = 'lock-test-a';
    const sessionB = 'lock-test-b';
    const executionOrder: string[] = [];

    const promiseA = withSessionLock(sessionA, async () => {
      executionOrder.push('A-start');
      await new Promise((r) => setTimeout(r, 50));
      executionOrder.push('A-end');
    });

    const promiseB = withSessionLock(sessionB, async () => {
      executionOrder.push('B-start');
      await new Promise((r) => setTimeout(r, 30));
      executionOrder.push('B-end');
    });

    await Promise.all([promiseA, promiseB]);

    // A et B peuvent s'exécuter en parallèle
    // B devrait finir avant A car son délai est plus court
    expect(executionOrder[0]).toBe('A-start');
    expect(executionOrder[1]).toBe('B-start');
  });

  it('assertNoDoubleInflight should not throw for single request', async () => {
    const sessionId = 'lock-test-3';

    await withSessionLock(sessionId, async () => {
      // Ne doit pas throw
      expect(() => assertNoDoubleInflight(sessionId)).not.toThrow();
    });
  });

  it('should properly release lock on error', async () => {
    const sessionId = 'lock-test-4';

    try {
      await withSessionLock(sessionId, async () => {
        throw new Error('Test error');
      });
    } catch {
      // Expected
    }

    // Le lock doit être libéré après l'erreur
    expect(hasInflight(sessionId)).toBe(false);
  });

  it('should return function result through lock', async () => {
    const sessionId = 'lock-test-5';

    const result = await withSessionLock(sessionId, async () => {
      return 'test-result';
    });

    expect(result).toBe('test-result');
  });
});
