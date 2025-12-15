/**
 * IActionMemoryStore - Interface pour les stores de mémoire d'actions
 *
 * O11: Abstraction pour permettre Redis ou Map comme backend.
 *
 * INVARIANT I1: Stocke UNIQUEMENT le contexte opérationnel.
 * JAMAIS de texte conversationnel, JAMAIS sérialisé vers Groq.
 */

import { ActionContext, ActionScope, ActionType, PendingConfirmation, QueryFilter } from '../Types';

/**
 * Interface commune pour les stores de mémoire d'actions.
 * Les implémentations (Map, Redis) doivent garantir l'invariant I1.
 */
export interface IActionMemoryStore {
  /**
   * Retourne le contexte actuel (copie).
   */
  getContext(): ActionContext;

  /**
   * Retourne les IDs de projets sélectionnés.
   */
  getSelectedProjectIds(): readonly string[];

  /**
   * Retourne le filtre actuel.
   */
  getFilter(): QueryFilter | null;

  /**
   * Retourne la confirmation en attente.
   */
  getPendingConfirmation(): PendingConfirmation | null;

  /**
   * Vérifie si le store a expiré.
   */
  isExpired(): boolean;

  /**
   * Met à jour les IDs de projets sélectionnés.
   */
  setSelectedProjectIds(ids: string[]): void;

  /**
   * Ajoute des IDs aux projets sélectionnés.
   */
  addSelectedProjectIds(ids: string[]): void;

  /**
   * Met à jour le filtre.
   */
  setFilter(filter: QueryFilter | null): void;

  /**
   * Met à jour le dernier type d'action.
   */
  setLastActionType(actionType: ActionType): void;

  /**
   * Met à jour le scope.
   */
  setScope(scope: ActionScope): void;

  /**
   * Définit une confirmation en attente.
   */
  setPendingConfirmation(confirmation: Omit<PendingConfirmation, 'expiresAt'> | null): void;

  /**
   * Met à jour le curseur de pagination.
   */
  setCursor(cursor: string | null): void;

  /**
   * Réinitialise le contexte.
   */
  reset(): void;

  /**
   * Exporte l'état pour persistance.
   */
  export(): ActionContext;

  /**
   * Importe un état sauvegardé.
   */
  import(context: Partial<ActionContext>): void;

  /**
   * Vérifie les invariants.
   */
  validateInvariants(): { valid: boolean; violations: string[] };
}

/**
 * Configuration pour les stores Redis d'actions.
 */
export interface RedisActionStoreConfig {
  /** URL de connexion Redis */
  redisUrl: string;
  /** Préfixe des clés (ex: 'larian:action:') */
  keyPrefix?: string;
  /** TTL en millisecondes (défaut: 5 min pour actions) */
  ttlMs?: number;
}
