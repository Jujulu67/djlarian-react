/**
 * ActionMemoryStore
 *
 * Stocke UNIQUEMENT le contexte opérationnel pour le parser d'actions.
 * N'est JAMAIS envoyé à Groq.
 *
 * INTERDICTIONS:
 * - Stocker du texte conversationnel
 * - Être sérialisé vers le payload Groq
 * - Contenir des messages complets
 */

import {
  ActionContext,
  ActionMemoryOptions,
  ActionScope,
  ActionType,
  PendingConfirmation,
  QueryFilter,
} from './Types';

/** Contexte par défaut */
const DEFAULT_CONTEXT: ActionContext = {
  lastSelectedProjectIds: [],
  lastQueryFilter: null,
  lastActionType: null,
  lastScope: 'all',
  pendingConfirmation: null,
  cursor: null,
  lastActivityAt: Date.now(),
};

/** TTL par défaut: 30 minutes */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

export class ActionMemoryStore {
  private context: ActionContext;
  private readonly options: Required<ActionMemoryOptions>;
  private expiresAt: number;

  constructor(options: ActionMemoryOptions) {
    this.options = {
      ttlMs: options.ttlMs || DEFAULT_TTL_MS,
      sessionId: options.sessionId,
      userId: options.userId || 'anonymous',
    };
    this.context = { ...DEFAULT_CONTEXT };
    this.expiresAt = Date.now() + this.options.ttlMs;
  }

  // ==========================================================================
  // Public API - Getters
  // ==========================================================================

  /**
   * Retourne le contexte actuel (copie).
   * Rafraîchit le TTL.
   */
  getContext(): ActionContext {
    this.refreshTTL();
    return { ...this.context };
  }

  /**
   * Retourne les IDs de projets sélectionnés.
   */
  getSelectedProjectIds(): readonly string[] {
    this.refreshTTL();
    return Object.freeze([...this.context.lastSelectedProjectIds]);
  }

  /**
   * Retourne le filtre actuel.
   */
  getFilter(): QueryFilter | null {
    this.refreshTTL();
    return this.context.lastQueryFilter ? { ...this.context.lastQueryFilter } : null;
  }

  /**
   * Retourne la confirmation en attente.
   */
  getPendingConfirmation(): PendingConfirmation | null {
    // Vérifier si la confirmation a expiré
    if (this.context.pendingConfirmation) {
      if (Date.now() > this.context.pendingConfirmation.expiresAt) {
        this.debugLog('Pending confirmation expired');
        this.context.pendingConfirmation = null;
      }
    }
    return this.context.pendingConfirmation ? { ...this.context.pendingConfirmation } : null;
  }

  /**
   * Vérifie si le store a expiré.
   */
  isExpired(): boolean {
    return Date.now() > this.expiresAt;
  }

  // ==========================================================================
  // Public API - Setters
  // ==========================================================================

  /**
   * Met à jour les IDs de projets sélectionnés.
   */
  setSelectedProjectIds(ids: string[]): void {
    this.context.lastSelectedProjectIds = [...ids];
    this.context.lastActivityAt = Date.now();
    this.refreshTTL();
    this.debugLog(`Selected projects updated: ${ids.length} items`);
  }

  /**
   * Ajoute des IDs aux projets sélectionnés.
   */
  addSelectedProjectIds(ids: string[]): void {
    const uniqueIds = new Set([...this.context.lastSelectedProjectIds, ...ids]);
    this.context.lastSelectedProjectIds = Array.from(uniqueIds);
    this.context.lastActivityAt = Date.now();
    this.refreshTTL();
    this.debugLog(
      `Selected projects extended: ${this.context.lastSelectedProjectIds.length} items`
    );
  }

  /**
   * Met à jour le filtre.
   */
  setFilter(filter: QueryFilter | null): void {
    this.context.lastQueryFilter = filter ? { ...filter } : null;
    this.context.lastActivityAt = Date.now();
    this.refreshTTL();
    this.debugLog(`Filter updated: ${filter ? JSON.stringify(filter) : 'null'}`);
  }

  /**
   * Met à jour le dernier type d'action.
   */
  setLastActionType(actionType: ActionType): void {
    this.context.lastActionType = actionType;
    this.context.lastActivityAt = Date.now();
    this.refreshTTL();
    this.debugLog(`Last action type: ${actionType}`);
  }

  /**
   * Met à jour le scope.
   */
  setScope(scope: ActionScope): void {
    this.context.lastScope = scope;
    this.context.lastActivityAt = Date.now();
    this.refreshTTL();
    this.debugLog(`Scope updated: ${scope}`);
  }

  /**
   * Définit une confirmation en attente.
   */
  setPendingConfirmation(confirmation: Omit<PendingConfirmation, 'expiresAt'> | null): void {
    if (confirmation) {
      this.context.pendingConfirmation = {
        ...confirmation,
        expiresAt: Date.now() + 60000, // 1 minute pour confirmer
      };
      this.debugLog(
        `Pending confirmation set: ${confirmation.actionType} on ${confirmation.targetIds.length} items`
      );
    } else {
      this.context.pendingConfirmation = null;
      this.debugLog('Pending confirmation cleared');
    }
    this.context.lastActivityAt = Date.now();
    this.refreshTTL();
  }

  /**
   * Met à jour le curseur de pagination.
   */
  setCursor(cursor: string | null): void {
    this.context.cursor = cursor;
    this.context.lastActivityAt = Date.now();
    this.refreshTTL();
    this.debugLog(`Cursor updated: ${cursor ?? 'null'}`);
  }

  /**
   * Réinitialise le contexte.
   */
  reset(): void {
    this.context = { ...DEFAULT_CONTEXT };
    this.refreshTTL();
    this.debugLog('Context reset to default');
  }

  // ==========================================================================
  // Export/Import
  // ==========================================================================

  /**
   * Exporte l'état pour persistance.
   */
  export(): ActionContext {
    return { ...this.context };
  }

  /**
   * Importe un état sauvegardé.
   */
  import(context: Partial<ActionContext>): void {
    this.context = {
      ...DEFAULT_CONTEXT,
      ...context,
      lastActivityAt: Date.now(),
    };
    this.refreshTTL();
    this.debugLog('Context imported');
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Vérifie les invariants.
   */
  validateInvariants(): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Invariant: pas de texte long dans le contexte
    const contextStr = JSON.stringify(this.context);
    if (contextStr.length > 10000) {
      violations.push(`Context too large: ${contextStr.length} chars`);
    }

    // Invariant: lastSelectedProjectIds doit être un tableau de strings
    if (!Array.isArray(this.context.lastSelectedProjectIds)) {
      violations.push('lastSelectedProjectIds is not an array');
    }

    // Invariant: TTL valide
    if (this.isExpired()) {
      violations.push('Store has expired');
    }

    if (violations.length > 0 && this.isDebugEnabled()) {
      console.error('[ActionMemory] Invariant violations:', violations);
    }

    return { valid: violations.length === 0, violations };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private refreshTTL(): void {
    this.expiresAt = Date.now() + this.options.ttlMs;
  }

  private isDebugEnabled(): boolean {
    return process.env.ASSISTANT_DEBUG === 'true';
  }

  private debugLog(message: string): void {
    if (this.isDebugEnabled()) {
      console.log(`[ActionMemory][${this.options.sessionId}] ${message}`);
    }
  }
}

// ==========================================================================
// Factory
// ==========================================================================

/** Map des stores par session (côté serveur) */
const storeMap = new Map<string, ActionMemoryStore>();

/**
 * Récupère ou crée un store pour une session.
 * Nettoie automatiquement les stores expirés.
 */
export function getActionMemoryStore(
  sessionId: string,
  options?: Partial<ActionMemoryOptions>
): ActionMemoryStore {
  // Cleanup des stores expirés (lazy)
  const entries = Array.from(storeMap.entries());
  entries.forEach(([key, store]) => {
    if (store.isExpired()) {
      storeMap.delete(key);
    }
  });

  if (!storeMap.has(sessionId)) {
    storeMap.set(
      sessionId,
      new ActionMemoryStore({
        sessionId,
        ttlMs: options?.ttlMs ?? DEFAULT_TTL_MS,
        userId: options?.userId,
      })
    );
  }

  return storeMap.get(sessionId)!;
}

/**
 * Supprime un store de session.
 */
export function clearActionMemoryStore(sessionId: string): void {
  storeMap.delete(sessionId);
}

/**
 * Retourne le nombre de stores actifs.
 */
export function getActiveStoreCount(): number {
  return storeMap.size;
}
