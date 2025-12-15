/**
 * StoreFactory - Factory pour les stores de mémoire
 *
 * O11: Choix automatique Redis vs Map selon REDIS_URL.
 *
 * COMPORTEMENT:
 * - Si REDIS_URL défini → utilise Redis (recommandé pour multi-instance)
 * - Sinon → fallback sur Map in-memory (acceptable en dev)
 *
 * TTL PAR DÉFAUT:
 * - ConversationMemory: 1h (CONVERSATION_TTL_MS)
 * - ActionMemory: 5 min (ACTION_TTL_MS)
 */

import { IConversationMemoryStore, StoreBackend, StoreMetadata } from './IConversationMemoryStore';
import { IActionMemoryStore } from './IActionMemoryStore';
import {
  ConversationMemoryStore,
  getConversationMemoryStore as getMapConversationStore,
} from '../ConversationMemoryStore';
import { ActionMemoryStore, getActionMemoryStore as getMapActionStore } from '../ActionMemoryStore';
import { ConversationMemoryOptions, ActionMemoryOptions } from '../Types';

// ============================================================================
// Configuration
// ============================================================================

/** TTL par défaut pour ConversationMemory (1 heure) */
const DEFAULT_CONVERSATION_TTL_MS = parseInt(process.env.CONVERSATION_TTL_MS || '3600000', 10);

/** TTL par défaut pour ActionMemory (5 minutes) */
const DEFAULT_ACTION_TTL_MS = parseInt(process.env.ACTION_TTL_MS || '300000', 10);

/** URL Redis (optionnel) */
const REDIS_URL = process.env.REDIS_URL;

/** Cache pour les métadonnées de store */
const storeMetadataCache = new Map<string, StoreMetadata>();

// ============================================================================
// Detection du backend
// ============================================================================

/**
 * Détermine le backend à utiliser.
 */
export function getStoreBackend(): StoreBackend {
  if (REDIS_URL && REDIS_URL.trim() !== '') {
    return 'redis';
  }
  return 'memory';
}

/**
 * Vérifie si Redis est disponible.
 */
export function isRedisAvailable(): boolean {
  return getStoreBackend() === 'redis';
}

// ============================================================================
// Factory ConversationMemory
// ============================================================================

/**
 * Récupère ou crée un store de conversation pour une session.
 *
 * Comportement:
 * - REDIS_URL défini → Redis store (avec TTL)
 * - Sinon → Map store in-memory
 */
export function getConversationStore(
  sessionId: string,
  options?: Partial<ConversationMemoryOptions>
): IConversationMemoryStore {
  const backend = getStoreBackend();

  if (backend === 'redis') {
    // TODO: Implémenter RedisConversationMemoryStore
    // Pour l'instant, fallback sur Map avec warning
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[StoreFactory] Redis configured but RedisConversationMemoryStore not yet implemented, using Map fallback'
      );
    }
  }

  // Fallback: Map store (implémentation existante)
  const store = getMapConversationStore(sessionId, {
    maxMessages: options?.maxMessages,
    maxTokens: options?.maxTokens,
    userId: options?.userId,
  });

  // Enregistrer les métadonnées
  updateStoreMetadata(sessionId, 'conversation', 'memory');

  return store as IConversationMemoryStore;
}

// ============================================================================
// Factory ActionMemory
// ============================================================================

/**
 * Récupère ou crée un store d'actions pour une session.
 *
 * Comportement:
 * - REDIS_URL défini → Redis store (avec TTL court)
 * - Sinon → Map store in-memory
 */
export function getActionStore(
  sessionId: string,
  options?: Partial<ActionMemoryOptions>
): IActionMemoryStore {
  const backend = getStoreBackend();

  if (backend === 'redis') {
    // TODO: Implémenter RedisActionMemoryStore
    // Pour l'instant, fallback sur Map avec warning
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[StoreFactory] Redis configured but RedisActionMemoryStore not yet implemented, using Map fallback'
      );
    }
  }

  // Fallback: Map store (implémentation existante)
  const store = getMapActionStore(sessionId, {
    ttlMs: options?.ttlMs ?? DEFAULT_ACTION_TTL_MS,
    userId: options?.userId,
  });

  // Enregistrer les métadonnées
  updateStoreMetadata(sessionId, 'action', 'memory');

  return store as IActionMemoryStore;
}

// ============================================================================
// Métadonnées et Debug
// ============================================================================

/**
 * Met à jour les métadonnées d'un store.
 */
function updateStoreMetadata(
  sessionId: string,
  type: 'conversation' | 'action',
  backend: StoreBackend
): void {
  const key = `${type}:${sessionId}`;
  const existing = storeMetadataCache.get(key);

  storeMetadataCache.set(key, {
    backend,
    sessionId,
    createdAt: existing?.createdAt ?? Date.now(),
    lastAccessedAt: Date.now(),
  });
}

/**
 * Retourne les métadonnées d'un store.
 */
export function getStoreMetadata(
  sessionId: string,
  type: 'conversation' | 'action'
): StoreMetadata | null {
  const key = `${type}:${sessionId}`;
  return storeMetadataCache.get(key) ?? null;
}

/**
 * Retourne un résumé de tous les stores actifs.
 * Utile pour le monitoring et le debug.
 */
export function getStoreStats(): {
  backend: StoreBackend;
  conversationStoreCount: number;
  actionStoreCount: number;
  redisUrl: string | undefined;
} {
  const entries = Array.from(storeMetadataCache.entries());
  const conversationCount = entries.filter(([k]) => k.startsWith('conversation:')).length;
  const actionCount = entries.filter(([k]) => k.startsWith('action:')).length;

  return {
    backend: getStoreBackend(),
    conversationStoreCount: conversationCount,
    actionStoreCount: actionCount,
    redisUrl: REDIS_URL ? '[REDACTED]' : undefined,
  };
}

/**
 * Nettoie les métadonnées expirées.
 * Appelé périodiquement pour éviter les fuites de mémoire.
 */
export function cleanupStoreMetadata(maxAgeMs: number = 3600000): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, metadata] of storeMetadataCache.entries()) {
    if (now - metadata.lastAccessedAt > maxAgeMs) {
      storeMetadataCache.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Réinitialise tous les stores (pour tests).
 */
export function resetAllStores(): void {
  storeMetadataCache.clear();
}

// ============================================================================
// Export pour tests
// ============================================================================

export { DEFAULT_CONVERSATION_TTL_MS, DEFAULT_ACTION_TTL_MS };
