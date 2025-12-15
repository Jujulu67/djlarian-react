/**
 * IConversationMemoryStore - Interface pour les stores de mémoire conversationnelle
 *
 * O11: Abstraction pour permettre Redis ou Map comme backend.
 *
 * INVARIANT I1: Stocke UNIQUEMENT les messages chat (kind='chat').
 * JAMAIS de résultats d'actions ou de données projet.
 */

import { ChatMessage, MessageRole } from '../Types';

/**
 * Interface commune pour les stores de mémoire conversationnelle.
 * Les implémentations (Map, Redis) doivent garantir l'invariant I1.
 */
export interface IConversationMemoryStore {
  /**
   * Ajoute un message chat à la mémoire.
   * Implémentation doit rejeter les messages pollués.
   */
  add(role: MessageRole, content: string): ChatMessage | null;

  /**
   * Retourne tous les messages chat (pour Groq).
   * Retourne une copie immuable.
   */
  getMessages(): readonly ChatMessage[];

  /**
   * Retourne les N derniers messages.
   */
  getLastMessages(count: number): readonly ChatMessage[];

  /**
   * Retourne le nombre de messages.
   */
  readonly size: number;

  /**
   * Retourne le total estimé de tokens.
   */
  readonly totalTokens: number;

  /**
   * Vide la mémoire.
   */
  clear(): void;

  /**
   * Exporte l'état pour persistance.
   */
  export(): ChatMessage[];

  /**
   * Importe un état sauvegardé (avec validation).
   * Retourne le nombre de messages importés.
   */
  import(messages: ChatMessage[]): number;

  /**
   * Vérifie qu'aucun message ne viole les invariants.
   */
  validateInvariants(): { valid: boolean; violations: string[] };
}

/**
 * Configuration pour les stores Redis.
 */
export interface RedisStoreConfig {
  /** URL de connexion Redis (ex: redis://localhost:6379) */
  redisUrl: string;
  /** Préfixe des clés (ex: 'larian:conv:') */
  keyPrefix?: string;
  /** TTL en millisecondes (défaut: 1h pour conversation) */
  ttlMs?: number;
}

/**
 * États possibles du store.
 */
export type StoreBackend = 'redis' | 'memory';

/**
 * Métadonnées du store pour debug/monitoring.
 */
export interface StoreMetadata {
  backend: StoreBackend;
  sessionId: string;
  createdAt: number;
  lastAccessedAt: number;
}
