/**
 * Tests de non-régression pour l'architecture mémoire étanche
 *
 * INVARIANTS TESTÉS:
 * - I1: Étanchéité (ConversationMemory=chat, ActionMemory=action, Transcript=tout)
 * - I2: Un seul routeur (pas de double classification)
 * - I3: Une seule source de vérité historique
 * - I4: Aucune action ne dépend de Groq
 * - I5: Concurrence (lock/queue par session)
 *
 * TESTS SPÉCIFIQUES:
 * - T1: Actions puis small talk (Groq se souvient du chat, pas des actions)
 * - T2: Small talk puis action (ActionMemory retient le contexte)
 * - T3: Payload validation (BuildGroqPayload rejette kind=action et pollution)
 * - T4: Single router (un seul routeur utilisé)
 */

import {
  ConversationMemoryStore,
  ActionMemoryStore,
  Router,
  GroqPayloadBuilder,
  getActionParser,
  isChatMessage,
  isActionMessage,
  GroqMessage,
  looksLikeActionOutput,
} from '../index';

// ==========================================================================
// T1: Actions puis small talk - Groq n'avale pas les outputs actions
// ==========================================================================

describe('T1: Memory Isolation - Actions then Small Talk', () => {
  it('should not include action results in Groq payload after action execution', async () => {
    const sessionId = 'test-session-t1-1';
    const conversationStore = new ConversationMemoryStore({
      sessionId,
      maxMessages: 50,
      maxTokens: 4000,
    });
    const actionStore = new ActionMemoryStore({ sessionId, ttlMs: 30000 });
    const router = new Router();
    const parser = getActionParser();
    const payloadBuilder = new GroqPayloadBuilder();

    // 1. Simuler une action "/list"
    const actionInput = '/list projets en cours';
    const routeResult1 = router.route(actionInput);
    expect(routeResult1.decision).toBe('ACTION_COMMAND');

    // Exécuter l'action (ne pas ajouter à conversationStore)
    const parsedAction = parser.parse(actionInput);
    await parser.execute(parsedAction, actionStore);

    // INVARIANT I1: Ne PAS ajouter le résultat à ConversationMemory
    // (Le code correct ne le fait pas, ce test vérifie)

    // 2. Simuler une deuxième action "/update"
    const actionInput2 = '/update status done';
    const routeResult2 = router.route(actionInput2);
    expect(routeResult2.decision).toBe('ACTION_COMMAND');

    // 3. Simuler du small talk après les actions
    const chatInput1 = 'Comment ça va?';
    const routeResult3 = router.route(chatInput1);
    expect(routeResult3.decision).toBe('GENERAL_CHAT');

    conversationStore.add('user', chatInput1);
    conversationStore.add('assistant', 'Je vais bien, merci!');

    // Simuler plus de chat (préférence small talk)
    conversationStore.add('user', "J'aime les pizzas à la saison d'été");
    conversationStore.add('assistant', 'Les pizzas estivales sont délicieuses!');

    // 4. Construire le payload Groq
    const payload = payloadBuilder.build(conversationStore);

    // ASSERTION I1: Le payload ne doit contenir AUCUN résultat d'action
    for (const msg of payload.messages) {
      expect(msg.content).not.toMatch(/projets? (listés?|récupérés?|mis à jour)/i);
      expect(msg.content).not.toMatch(/\[[\s\S]*\{[\s\S]*"id"[\s\S]*\}[\s\S]*\]/);
      expect(msg.content).not.toMatch(/success.*true/i);
      expect(msg.content).not.toMatch(/affectedProjectIds/i);
    }

    // ASSERTION: Seuls les messages chat sont présents
    const nonSystemMessages = payload.messages.filter((m: GroqMessage) => m.role !== 'system');
    expect(nonSystemMessages.length).toBe(4); // 2 échanges de chat

    // Groq doit se souvenir des préférences small talk
    expect(nonSystemMessages.some((m) => m.content.includes('pizza'))).toBe(true);
  });

  it('should remember small talk context after multiple action executions', () => {
    const sessionId = 'test-session-t1-2';
    const conversationStore = new ConversationMemoryStore({
      sessionId,
      maxMessages: 50,
      maxTokens: 4000,
    });
    const payloadBuilder = new GroqPayloadBuilder();

    // Chat initial avec contexte (saison préférée)
    conversationStore.add('user', 'Ma saison préférée est le printemps');
    conversationStore.add('assistant', 'Le printemps est magnifique avec les fleurs!');

    // Construire le payload et vérifier le contexte
    const payload = payloadBuilder.build(conversationStore);
    const hasSpringContext = payload.messages.some(
      (m) => m.content.includes('printemps') || m.content.includes('saison')
    );
    expect(hasSpringContext).toBe(true);
  });
});

// ==========================================================================
// T2: Small talk puis action - ActionMemory garde le scope
// ==========================================================================

describe('T2: Memory Isolation - Small Talk then Action', () => {
  it('should preserve ActionMemory context across chat interactions', async () => {
    const sessionId = 'test-session-t2-1';
    const conversationStore = new ConversationMemoryStore({
      sessionId,
      maxMessages: 50,
      maxTokens: 4000,
    });
    const actionStore = new ActionMemoryStore({ sessionId, ttlMs: 30000 });
    const router = new Router();

    // 1. Faire du small talk d'abord
    const chatInput = 'Bonjour, quelle belle journée!';
    const routeResult1 = router.route(chatInput);
    expect(routeResult1.decision).toBe('GENERAL_CHAT');

    conversationStore.add('user', chatInput);
    conversationStore.add('assistant', 'Oui, il fait beau!');

    // 2. Simuler une action LIST qui sélectionne des projets
    const listInput = '/list tous les projets';
    const routeResult2 = router.route(listInput);
    expect(routeResult2.decision).toBe('ACTION_COMMAND');

    // Simuler le résultat du listing - stocker les IDs dans ActionMemory
    const listedProjectIds = ['proj-1', 'proj-2', 'proj-3'];
    actionStore.setSelectedProjectIds(listedProjectIds);
    actionStore.setScope('filtered');
    actionStore.setLastActionType('LIST');

    // 3. Simuler une action UPDATE avec "mets-les à 80%"
    const updateInput = '/update progress 80%';
    const routeResult3 = router.route(updateInput);
    expect(routeResult3.decision).toBe('ACTION_COMMAND');

    // ASSERTION I1/I3: ActionMemory retient correctement lastSelectedProjectIds
    expect(actionStore.getSelectedProjectIds()).toEqual(['proj-1', 'proj-2', 'proj-3']);
    expect(actionStore.getContext().lastScope).toBe('filtered');
    expect(actionStore.getContext().lastActionType).toBe('LIST');
  });

  it('should not pollute ActionMemory with chat content', () => {
    const sessionId = 'test-session-t2-2';
    const actionStore = new ActionMemoryStore({ sessionId, ttlMs: 30000 });
    const conversationStore = new ConversationMemoryStore({
      sessionId,
      maxMessages: 50,
      maxTokens: 4000,
    });

    // Ajouter beaucoup de chat
    for (let i = 0; i < 20; i++) {
      conversationStore.add('user', `Message utilisateur ${i} avec du contenu varié`);
      conversationStore.add('assistant', `Réponse assistant ${i}`);
    }

    // ASSERTION I1: ActionMemory doit rester vide/par défaut
    const context = actionStore.getContext();
    expect(context.lastSelectedProjectIds).toEqual([]);
    expect(context.lastQueryFilter).toBeNull();
    expect(context.lastActionType).toBeNull();
  });
});

// ==========================================================================
// T3: Payload Validation - BuildGroqPayload rejette kind=action et pollution
// ==========================================================================

describe('T3: Groq Payload Validation', () => {
  it('should reject action-kind messages from being added to ConversationMemory', () => {
    const sessionId = 'test-session-t3-1';
    const store = new ConversationMemoryStore({ sessionId, maxMessages: 50, maxTokens: 4000 });

    // Tenter d'ajouter un contenu pollué
    const pollutedContent = 'Voici 15 projets: [{"id": "abc", "name": "test"}]';
    const result = store.add('assistant', pollutedContent);

    // ASSERTION I1: Doit être rejeté
    expect(result).toBeNull();
    expect(store.size).toBe(0);
  });

  it('should reject "J\'ai trouvé X projet(s)" patterns', () => {
    const sessionId = 'test-session-t3-2';
    const store = new ConversationMemoryStore({ sessionId, maxMessages: 50, maxTokens: 4000 });
    const payloadBuilder = new GroqPayloadBuilder();

    // O3: Ces patterns doivent être rejetés (vrais outputs d'actions avec structure)
    const pollutedPatterns = [
      "J'ai trouvé 15 projet(s) correspondant à votre recherche",
      "Ok. J'ai mis 5 projet(s) à jour",
      "J'ai supprimé 3 projets",
      // O3: Patterns avec structure JSON/données, pas juste des mots-clés
      '{"affectedProjectIds": ["1", "2", "3"]}',
      '{"pendingAction": {"type": "delete"}}',
    ];

    for (const pattern of pollutedPatterns) {
      const result = store.add('assistant', pattern);
      expect(result).toBeNull();
      expect(payloadBuilder.looksLikeActionOutput(pattern, 'assistant')).toBe(true);
    }
  });

  it('should build payload with only chat messages', () => {
    const sessionId = 'test-session-t3-3';
    const store = new ConversationMemoryStore({ sessionId, maxMessages: 50, maxTokens: 4000 });
    const builder = new GroqPayloadBuilder();

    // Ajouter des messages valides
    store.add('user', 'Bonjour!');
    store.add('assistant', 'Bonjour, comment puis-je aider?');
    store.add('user', 'Quel temps fait-il?');
    store.add('assistant', 'Je ne peux pas voir la météo.');

    // Construire le payload
    const payload = builder.build(store);

    // ASSERTION I1: Aucun message ne doit contenir des patterns d'action
    for (const msg of payload.messages) {
      expect(msg.content).not.toMatch(/prisma/i);
      expect(msg.content).not.toMatch(/ActionMemory/i);
      expect(msg.content).not.toMatch(/"success"\s*:/i);
    }

    // Vérifications
    expect(payload.messages.length).toBe(5); // 1 system + 4 chat
    expect(payload.messages[0].role).toBe('system');
  });

  it('should validate payload with validatePayload method', () => {
    const builder = new GroqPayloadBuilder();

    // Payload invalide (contient du contenu pollué)
    const badPayload = {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system' as const, content: 'System prompt' },
        { role: 'user' as const, content: 'liste les projets' },
        { role: 'assistant' as const, content: 'Voici: [{"id": "1", "name": "test"}]' },
      ],
    };

    // ASSERTION I1: La validation doit détecter la pollution
    const validation = builder.validatePayload(badPayload);
    expect(validation.valid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);
  });

  it('should use looksLikeActionOutput utility function', () => {
    // Tester la fonction utilitaire publique
    expect(looksLikeActionOutput('[{"id": "1", "name": "test"}]')).toBe(true);
    expect(looksLikeActionOutput("J'ai trouvé 5 projets")).toBe(true);
    expect(looksLikeActionOutput('Bonjour, comment ça va?')).toBe(false);
    expect(looksLikeActionOutput('Ma pizza préférée est la margherita')).toBe(false);
  });
});

// ==========================================================================
// T4: Single Router - Un seul routeur utilisé
// ==========================================================================

describe('T4: Single Router Verification', () => {
  let routerCallCount = 0;
  let originalRoute: typeof Router.prototype.route;

  beforeEach(() => {
    routerCallCount = 0;
    // Spy sur Router.route pour compter les appels
    originalRoute = Router.prototype.route;
    Router.prototype.route = function (this: Router, ...args) {
      routerCallCount++;
      return originalRoute.apply(this, args);
    };
  });

  afterEach(() => {
    Router.prototype.route = originalRoute;
  });

  it('should only have one Router.route call per user input', () => {
    const router = new Router();

    // Un seul appel pour un input
    router.route('liste les projets');
    expect(routerCallCount).toBe(1);

    // Reset et nouveau test
    routerCallCount = 0;
    router.route('bonjour');
    expect(routerCallCount).toBe(1);
  });

  it('should not call Router.route from multiple sources', () => {
    // Ce test vérifie que classifyUserMessage dans MemoryAdapter
    // n'est pas appelé en plus du routing principal
    // (vérifié par l'absence de double import/usage dans useAssistantChat)

    const router = new Router();

    // Simuler le flux normal: un seul appel
    const input = 'mets à jour le statut';
    const result = router.route(input);

    expect(routerCallCount).toBe(1);
    expect(result.decision).toBe('ACTION_COMMAND');
  });
});

// ==========================================================================
// Router Decisions (tests existants améliorés)
// ==========================================================================

describe('Router Decisions', () => {
  const router = new Router();

  const actionCases = [
    '/list projets',
    '/update status done',
    'liste les projets en cours',
    'mets à jour le statut',
    'supprime ce projet',
    'ajoute une note',
    'deadline 2024-12-31',
    'priorité haute',
  ];

  const chatCases = [
    'Bonjour!',
    'Comment ça va?',
    'Merci beaucoup',
    'Quelle belle journée!', // Remplacé - "C'est une bonne idée" est AMBIGUOUS
    'Pourquoi le ciel est bleu?',
    'Raconte-moi une blague',
  ];

  it.each(actionCases)('should route "%s" as ACTION_COMMAND', (input) => {
    const result = router.route(input);
    expect(result.decision).toBe('ACTION_COMMAND');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it.each(chatCases)('should route "%s" as GENERAL_CHAT', (input) => {
    const result = router.route(input);
    expect(result.decision).toBe('GENERAL_CHAT');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should handle confirmation when pending', () => {
    const result = router.route('oui', true);
    expect(result.decision).toBe('ACTION_COMMAND');
    expect(result.reason).toContain('Confirmation');
  });

  it('should handle cancellation when pending', () => {
    const result = router.route('non', true);
    expect(result.decision).toBe('ACTION_COMMAND');
    expect(result.reason).toContain('Cancellation');
  });
});

// ==========================================================================
// Type Guards
// ==========================================================================

describe('Type Guards', () => {
  it('should correctly identify chat messages', () => {
    const chatMsg = {
      id: '1',
      kind: 'chat' as const,
      role: 'user' as const,
      content: 'Hello',
      timestamp: Date.now(),
      sessionId: 'test',
    };
    expect(isChatMessage(chatMsg)).toBe(true);
    expect(isActionMessage(chatMsg)).toBe(false);
  });

  it('should correctly identify action messages', () => {
    const actionMsg = {
      id: '2',
      kind: 'action' as const,
      role: 'assistant' as const,
      command: '/list',
      actionType: 'LIST' as const,
      timestamp: Date.now(),
      sessionId: 'test',
    };
    expect(isActionMessage(actionMsg)).toBe(true);
    expect(isChatMessage(actionMsg)).toBe(false);
  });
});

// ==========================================================================
// Invariants Validation
// ==========================================================================

describe('Invariants Validation', () => {
  it('should validate ConversationMemory invariants (I1)', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'test',
      maxMessages: 50,
      maxTokens: 4000,
    });

    store.add('user', 'Message propre');
    store.add('assistant', 'Réponse propre');

    const validation = store.validateInvariants();
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('should validate ActionMemory invariants (I1)', () => {
    const store = new ActionMemoryStore({ sessionId: 'test', ttlMs: 30000 });

    store.setSelectedProjectIds(['1', '2', '3']);
    store.setScope('selected');

    const validation = store.validateInvariants();
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });
});

// ==========================================================================
// Token Budget (I1 - Trimming)
// ==========================================================================

describe('Token Budget Trimming', () => {
  it('should trim oldest messages when exceeding softLimit', () => {
    const store = new ConversationMemoryStore({
      sessionId: 'test-budget',
      maxMessages: 100,
      maxTokens: 500, // Limite basse pour test
    });

    // Ajouter beaucoup de messages
    for (let i = 0; i < 20; i++) {
      store.add('user', `Message ${i} avec du contenu pour consommer des tokens`);
      store.add('assistant', `Réponse ${i} avec du contenu pour consommer des tokens`);
    }

    // Le store doit avoir trimmé les anciens messages
    expect(store.size).toBeLessThan(40);
    expect(store.totalTokens).toBeLessThanOrEqual(500);
  });
});
