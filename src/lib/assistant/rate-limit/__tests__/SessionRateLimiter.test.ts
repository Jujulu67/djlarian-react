/**
 * Tests O12 - Session Rate Limiter
 *
 * Vérifie:
 * - N appels rapides → le (N+1) est bloqué
 * - Après la fenêtre → à nouveau autorisé
 * - Rate limit ne pollue pas ConversationMemory
 */

import {
  SessionRateLimiter,
  getSessionRateLimiter,
  resetRateLimiter,
  createRateLimitResponse,
  RATE_LIMIT_STATUS_CODE,
} from '../SessionRateLimiter';

describe('O12: Session Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimiter();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    resetRateLimiter();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      const limiter = new SessionRateLimiter({
        maxRequests: 5,
        windowMs: 10000,
      });

      const sessionId = 'test-session-1';

      // 5 requêtes devraient passer
      for (let i = 0; i < 5; i++) {
        const result = await limiter.check(sessionId);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block the (N+1)th request when limit is reached', async () => {
      const limiter = new SessionRateLimiter({
        maxRequests: 3,
        windowMs: 10000,
      });

      const sessionId = 'test-session-2';

      // 3 requêtes autorisées
      await limiter.check(sessionId);
      await limiter.check(sessionId);
      await limiter.check(sessionId);

      // 4ème requête bloquée
      const result = await limiter.check(sessionId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.message).toContain('Rate limit exceeded');
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('should allow requests again after window expires', async () => {
      const windowMs = 5000;
      const limiter = new SessionRateLimiter({
        maxRequests: 2,
        windowMs,
      });

      const sessionId = 'test-session-3';

      // Épuiser la limite
      await limiter.check(sessionId);
      await limiter.check(sessionId);

      const blocked = await limiter.check(sessionId);
      expect(blocked.allowed).toBe(false);

      // Avancer le temps au-delà de la fenêtre
      jest.advanceTimersByTime(windowMs + 100);

      // Nouvelle fenêtre, devrait être autorisé
      const allowed = await limiter.check(sessionId);
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(1);
    });
  });

  describe('Session Isolation', () => {
    it('should track limits per session independently', async () => {
      const limiter = new SessionRateLimiter({
        maxRequests: 2,
        windowMs: 10000,
      });

      const session1 = 'session-a';
      const session2 = 'session-b';

      // Épuiser la limite de session1
      await limiter.check(session1);
      await limiter.check(session1);
      const blocked1 = await limiter.check(session1);
      expect(blocked1.allowed).toBe(false);

      // Session2 devrait encore avoir sa limite
      const allowed2 = await limiter.check(session2);
      expect(allowed2.allowed).toBe(true);
      expect(allowed2.remaining).toBe(1);
    });

    it('should support userId+sessionId keying', async () => {
      const limiter = new SessionRateLimiter({
        maxRequests: 2,
        windowMs: 10000,
      });

      const sessionId = 'same-session';
      const user1 = 'user-a';
      const user2 = 'user-b';

      // Épuiser la limite de user1
      await limiter.check(sessionId, user1);
      await limiter.check(sessionId, user1);
      const blocked = await limiter.check(sessionId, user1);
      expect(blocked.allowed).toBe(false);

      // User2 avec le même sessionId devrait avoir sa propre limite
      const allowed = await limiter.check(sessionId, user2);
      expect(allowed.allowed).toBe(true);
    });
  });

  describe('Singleton and Reset', () => {
    it('should return shared instance via getSessionRateLimiter', async () => {
      const limiter1 = getSessionRateLimiter({ maxRequests: 5 });
      const limiter2 = getSessionRateLimiter();

      expect(limiter1).toBe(limiter2);
    });

    it('should reset properly', async () => {
      const limiter = new SessionRateLimiter({
        maxRequests: 1,
        windowMs: 10000,
      });

      const sessionId = 'test-reset';

      await limiter.check(sessionId);
      const blocked = await limiter.check(sessionId);
      expect(blocked.allowed).toBe(false);

      await limiter.reset(sessionId);

      const allowed = await limiter.check(sessionId);
      expect(allowed.allowed).toBe(true);
    });
  });

  describe('HTTP Response Helper', () => {
    it('should create proper 429 response', async () => {
      const limiter = new SessionRateLimiter({
        maxRequests: 1,
        windowMs: 60000,
      });

      await limiter.check('test-http');
      const result = await limiter.check('test-http');

      const response = createRateLimitResponse(result);

      expect(response.status).toBe(RATE_LIMIT_STATUS_CODE);
      expect(response.body.error).toBe('RATE_LIMITED');
      expect(response.body.retryAfterSeconds).toBeGreaterThan(0);
      expect(response.headers['Retry-After']).toBeDefined();
      expect(response.headers['X-RateLimit-Limit']).toBeDefined();
      expect(response.headers['X-RateLimit-Remaining']).toBe('0');
    });
  });

  describe('Stats and Monitoring', () => {
    it('should provide stats', async () => {
      const limiter = new SessionRateLimiter({
        maxRequests: 10,
        windowMs: 30000,
      });

      await limiter.check('session-x');
      await limiter.check('session-y');

      const stats = limiter.getStats();

      expect(stats.backend).toBe('memory');
      expect(stats.activeEntries).toBe(2);
      expect(stats.maxRequests).toBe(10);
      expect(stats.windowMs).toBe(30000);
    });
  });
});

describe('O12: Rate Limit Does Not Pollute Memory', () => {
  it('should not add anything to ConversationMemory when rate limited', async () => {
    // Import après reset pour s'assurer de l'état propre
    const { getConversationStore, resetAllStores } =
      await import('../../memory/stores/StoreFactory');

    resetAllStores();
    resetRateLimiter();

    const sessionId = 'test-no-pollution';
    const conversationStore = getConversationStore(sessionId);
    const limiter = new SessionRateLimiter({ maxRequests: 1, windowMs: 10000 });

    // Message initial
    conversationStore.add('user', 'Hello');
    expect(conversationStore.size).toBe(1);

    // Déclencher le rate limit
    await limiter.check(sessionId);
    const result = await limiter.check(sessionId);
    expect(result.allowed).toBe(false);

    // Le store ne doit PAS avoir été modifié par le rate limiter
    expect(conversationStore.size).toBe(1);

    // Ajouter un message propre après rate limit ne devrait pas être affecté
    conversationStore.add('assistant', 'Hi there!');
    expect(conversationStore.size).toBe(2);

    // Valider les invariants
    const validation = conversationStore.validateInvariants();
    expect(validation.valid).toBe(true);
  });
});
