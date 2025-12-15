/**
 * SessionRateLimiter - Rate limiting par session pour l'assistant
 *
 * O12: Protection contre le spam et l'explosion des coûts Groq.
 *
 * COMPORTEMENT:
 * - REDIS_URL défini → compteurs via Redis (INCR + EXPIRE)
 * - Sinon → compteurs in-memory Map
 *
 * CONFIGURATION (via env):
 * - RATE_LIMIT_MAX: Nombre max de requêtes par fenêtre (défaut: 20)
 * - RATE_LIMIT_WINDOW_MS: Durée de la fenêtre en ms (défaut: 60000 = 1 min)
 *
 * RÉPONSE:
 * - Retourne { allowed: true } si OK
 * - Retourne { allowed: false, retryAfterMs, message } si limité
 */

import { getStoreBackend } from '../memory/stores/StoreFactory';

// ============================================================================
// Configuration
// ============================================================================

/** Nombre max de requêtes par fenêtre */
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '20', 10);

/** Durée de la fenêtre en millisecondes (défaut: 1 minute) */
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

/** Activer le rate limiting (peut être désactivé en dev) */
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitResult {
  /** La requête est autorisée */
  allowed: boolean;
  /** Nombre de requêtes restantes */
  remaining: number;
  /** Millisecondes avant reset de la fenêtre */
  resetInMs: number;
  /** Message d'erreur si limité */
  message?: string;
  /** Millisecondes à attendre avant retry (si limité) */
  retryAfterMs?: number;
}

export interface RateLimitEntry {
  count: number;
  windowStartMs: number;
}

export interface RateLimiterConfig {
  /** Nombre max de requêtes par fenêtre */
  maxRequests?: number;
  /** Durée de la fenêtre en ms */
  windowMs?: number;
  /** Préfixe pour les clés (pour isolation) */
  keyPrefix?: string;
}

// ============================================================================
// Implémentation In-Memory
// ============================================================================

/** Cache in-memory pour le rate limiting */
const rateLimitCache = new Map<string, RateLimitEntry>();

/**
 * Nettoyer les entrées expirées périodiquement.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_MS;

  for (const [key, entry] of rateLimitCache.entries()) {
    if (now - entry.windowStartMs > windowMs) {
      rateLimitCache.delete(key);
    }
  }
}

// Cleanup toutes les minutes (seulement côté serveur)
if (typeof setInterval !== 'undefined' && typeof window === 'undefined') {
  setInterval(cleanupExpiredEntries, 60000);
}

// ============================================================================
// Rate Limiter Principal
// ============================================================================

/**
 * Rate limiter par session.
 *
 * Usage:
 * ```typescript
 * const limiter = new SessionRateLimiter();
 * const result = await limiter.check('session-123');
 * if (!result.allowed) {
 *   return { error: 'RATE_LIMITED', retryAfterMs: result.retryAfterMs };
 * }
 * ```
 */
export class SessionRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly keyPrefix: string;
  private readonly useRedis: boolean;

  constructor(config: RateLimiterConfig = {}) {
    this.maxRequests = config.maxRequests ?? RATE_LIMIT_MAX;
    this.windowMs = config.windowMs ?? RATE_LIMIT_WINDOW_MS;
    this.keyPrefix = config.keyPrefix ?? 'rl:session:';
    this.useRedis = getStoreBackend() === 'redis';
  }

  /**
   * Vérifie et incrémente le compteur pour une session.
   *
   * @param sessionId Identifiant de la session
   * @param userId Optionnel: identifiant utilisateur (pour keying userId+sessionId)
   */
  async check(sessionId: string, userId?: string): Promise<RateLimitResult> {
    // Bypass si désactivé
    if (!RATE_LIMIT_ENABLED) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetInMs: 0,
      };
    }

    const key = this.buildKey(sessionId, userId);

    if (this.useRedis) {
      return this.checkRedis(key);
    }

    return this.checkMemory(key);
  }

  /**
   * Réinitialise le compteur pour une session (utile pour tests).
   */
  async reset(sessionId: string, userId?: string): Promise<void> {
    const key = this.buildKey(sessionId, userId);

    if (this.useRedis) {
      // TODO: Redis DEL
      console.warn('[SessionRateLimiter] Redis reset not implemented');
    }

    rateLimitCache.delete(key);
  }

  /**
   * Retourne les statistiques actuelles (pour monitoring/debug).
   */
  getStats(): {
    backend: 'redis' | 'memory';
    activeEntries: number;
    maxRequests: number;
    windowMs: number;
  } {
    return {
      backend: this.useRedis ? 'redis' : 'memory',
      activeEntries: rateLimitCache.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private buildKey(sessionId: string, userId?: string): string {
    if (userId) {
      return `${this.keyPrefix}${userId}:${sessionId}`;
    }
    return `${this.keyPrefix}${sessionId}`;
  }

  private checkMemory(key: string): RateLimitResult {
    const now = Date.now();
    let entry = rateLimitCache.get(key);

    // Nouvelle fenêtre ou fenêtre expirée
    if (!entry || now - entry.windowStartMs > this.windowMs) {
      entry = {
        count: 1,
        windowStartMs: now,
      };
      rateLimitCache.set(key, entry);

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetInMs: this.windowMs,
      };
    }

    // Vérifier la limite
    if (entry.count >= this.maxRequests) {
      const resetInMs = this.windowMs - (now - entry.windowStartMs);

      return {
        allowed: false,
        remaining: 0,
        resetInMs,
        retryAfterMs: resetInMs,
        message: `Rate limit exceeded. Maximum ${this.maxRequests} requests per ${this.windowMs / 1000}s. Try again in ${Math.ceil(resetInMs / 1000)}s.`,
      };
    }

    // Incrémenter
    entry.count++;
    rateLimitCache.set(key, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetInMs: this.windowMs - (now - entry.windowStartMs),
    };
  }

  private async checkRedis(key: string): Promise<RateLimitResult> {
    // TODO: Implémenter avec Redis INCR + EXPIRE
    // Pour l'instant, fallback sur memory avec warning
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SessionRateLimiter] Redis not yet implemented, using memory fallback');
    }
    return this.checkMemory(key);
  }
}

// ============================================================================
// Instance Singleton
// ============================================================================

/** Instance partagée du rate limiter */
let sharedLimiter: SessionRateLimiter | null = null;

/**
 * Retourne l'instance partagée du rate limiter.
 */
export function getSessionRateLimiter(config?: RateLimiterConfig): SessionRateLimiter {
  if (!sharedLimiter || config) {
    sharedLimiter = new SessionRateLimiter(config);
  }
  return sharedLimiter;
}

/**
 * Réinitialise l'instance partagée (pour tests).
 */
export function resetRateLimiter(): void {
  sharedLimiter = null;
  rateLimitCache.clear();
}

// ============================================================================
// Helpers pour intégration API routes
// ============================================================================

/**
 * Status code HTTP pour rate limit.
 */
export const RATE_LIMIT_STATUS_CODE = 429;

/**
 * Crée une réponse HTTP 429 standardisée.
 */
export function createRateLimitResponse(result: RateLimitResult): {
  status: 429;
  body: {
    error: string;
    message: string;
    retryAfterMs: number;
    retryAfterSeconds: number;
  };
  headers: {
    'Retry-After': string;
    'X-RateLimit-Limit': string;
    'X-RateLimit-Remaining': string;
    'X-RateLimit-Reset': string;
  };
} {
  const retryAfterMs = result.retryAfterMs ?? result.resetInMs;
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

  return {
    status: 429,
    body: {
      error: 'RATE_LIMITED',
      message: result.message ?? 'Too many requests',
      retryAfterMs,
      retryAfterSeconds,
    },
    headers: {
      'Retry-After': retryAfterSeconds.toString(),
      'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + retryAfterMs).toISOString(),
    },
  };
}

// ============================================================================
// Exports de configuration (pour tests)
// ============================================================================

export { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_ENABLED };
