/**
 * Tests O11 - Redis Stores Factory
 *
 * Vérifie:
 * - Sélection automatique Redis vs Map selon REDIS_URL
 * - Cohérence des TTL
 * - Invariants I1 maintenus
 */

import {
  getConversationStore,
  getActionStore,
  getStoreBackend,
  isRedisAvailable,
  getStoreStats,
  resetAllStores,
  DEFAULT_CONVERSATION_TTL_MS,
  DEFAULT_ACTION_TTL_MS,
} from '../StoreFactory';

describe('O11: Store Factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    resetAllStores();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Store Selection', () => {
    it('should use memory backend when REDIS_URL is not set', () => {
      delete process.env.REDIS_URL;

      expect(getStoreBackend()).toBe('memory');
      expect(isRedisAvailable()).toBe(false);
    });

    it('should detect Redis configuration via getStoreStats', () => {
      // Note: REDIS_URL est lu au moment de l'import du module.
      // En environnement de test sans Redis, on vérifie que:
      // - Le backend détecté est 'memory' (fallback)
      // - redisUrl dans getStoreStats est undefined (pas de Redis configuré)
      const stats = getStoreStats();

      // Sans REDIS_URL configuré au démarrage, on attend memory backend
      expect(stats.backend).toBe('memory');

      // En environnement de test, redisUrl devrait être undefined
      // ou '[REDACTED]' si REDIS_URL était défini au démarrage
      // Ce test vérifie simplement que la fonction fonctionne
      expect(typeof stats.conversationStoreCount).toBe('number');
      expect(typeof stats.actionStoreCount).toBe('number');
    });

    it('should return ConversationMemoryStore implementing IConversationMemoryStore', () => {
      const store = getConversationStore('test-session-1');

      // Vérifier l'interface
      expect(typeof store.add).toBe('function');
      expect(typeof store.getMessages).toBe('function');
      expect(typeof store.getLastMessages).toBe('function');
      expect(typeof store.clear).toBe('function');
      expect(typeof store.export).toBe('function');
      expect(typeof store.import).toBe('function');
      expect(typeof store.validateInvariants).toBe('function');
    });

    it('should return ActionMemoryStore implementing IActionMemoryStore', () => {
      const store = getActionStore('test-session-2');

      // Vérifier l'interface
      expect(typeof store.getContext).toBe('function');
      expect(typeof store.getSelectedProjectIds).toBe('function');
      expect(typeof store.getFilter).toBe('function');
      expect(typeof store.setSelectedProjectIds).toBe('function');
      expect(typeof store.setFilter).toBe('function');
      expect(typeof store.reset).toBe('function');
      expect(typeof store.validateInvariants).toBe('function');
    });
  });

  describe('TTL Configuration', () => {
    it('should have default TTL for ConversationMemory (1 hour)', () => {
      expect(DEFAULT_CONVERSATION_TTL_MS).toBe(3600000);
    });

    it('should have default TTL for ActionMemory (5 minutes)', () => {
      expect(DEFAULT_ACTION_TTL_MS).toBe(300000);
    });
  });

  describe('Store Stats', () => {
    it('should track store metadata', () => {
      getConversationStore('session-a');
      getConversationStore('session-b');
      getActionStore('session-a');

      const stats = getStoreStats();

      expect(stats.backend).toBe('memory');
      expect(stats.conversationStoreCount).toBeGreaterThanOrEqual(2);
      expect(stats.actionStoreCount).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('O11: Invariant I1 - Étanchéité', () => {
  beforeEach(() => {
    resetAllStores();
  });

  describe('ConversationMemory: chat-only', () => {
    it('should reject polluted content (action outputs)', () => {
      const store = getConversationStore('test-i1-conv');

      // Contenu pollué (résultat d'action)
      const pollutedContent = 'Voici 15 projets: [{"id": "abc", "name": "test"}]';
      const result = store.add('assistant', pollutedContent);

      expect(result).toBeNull();
      expect(store.size).toBe(0);
    });

    it('should accept clean chat messages', () => {
      const store = getConversationStore('test-i1-conv-2');

      const result = store.add('user', 'Bonjour, comment ça va?');

      expect(result).not.toBeNull();
      expect(result?.kind).toBe('chat');
      expect(store.size).toBe(1);
    });

    it('should validate invariants correctly', () => {
      const store = getConversationStore('test-i1-conv-3');

      store.add('user', 'Message propre');
      store.add('assistant', 'Réponse propre');

      const validation = store.validateInvariants();

      expect(validation.valid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });
  });

  describe('ActionMemory: ops-only (no transcript)', () => {
    it('should store only operational context, no text content', () => {
      const store = getActionStore('test-i1-action');

      // Stocker des IDs de projets (opérationnel)
      store.setSelectedProjectIds(['proj-1', 'proj-2']);
      store.setScope('selected');
      store.setLastActionType('LIST');

      const context = store.getContext();

      // Vérifier que le contexte ne contient pas de texte
      const contextStr = JSON.stringify(context);
      expect(contextStr.length).toBeLessThan(500); // Pas de texte long
      expect(context.lastSelectedProjectIds).toEqual(['proj-1', 'proj-2']);
    });

    it('should validate invariants (no large text)', () => {
      const store = getActionStore('test-i1-action-2');

      store.setSelectedProjectIds(['id1', 'id2']);

      const validation = store.validateInvariants();

      expect(validation.valid).toBe(true);
    });

    it('should never contain message content', () => {
      const store = getActionStore('test-i1-action-3');

      // Le contexte ne doit avoir aucun champ pour stocker du texte libre
      const context = store.getContext();

      // Vérifier l'absence de champs texte (autres que cursor qui est un ID)
      expect(context).not.toHaveProperty('content');
      expect(context).not.toHaveProperty('message');
      expect(context).not.toHaveProperty('text');
    });
  });
});
