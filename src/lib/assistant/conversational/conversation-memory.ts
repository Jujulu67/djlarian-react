/**
 * Gestionnaire de mémoire conversationnelle pour l'assistant
 *
 * Ce module permet de garder en mémoire le contexte des requêtes précédentes
 * pour permettre l'enchaînement de commandes comme :
 * 1. "liste les projets ghost prod"
 * 2. "maintenant met les à 80%"
 *
 * Le contexte est stocké en mémoire par session utilisateur.
 */

export interface ConversationContext {
  // Derniers projets filtrés/affichés
  lastProjectIds: string[];
  lastProjectNames: string[];
  lastProjectCount: number;
  // Dernier filtre utilisé
  lastFilters: Record<string, any>;
  // Type de la dernière action
  lastActionType: 'list' | 'count' | 'update' | 'create' | 'search' | null;
  // Timestamp de la dernière action
  lastActionTimestamp: number;
  // Statut de la dernière action (pour référence)
  lastStatusFilter: string | null;
}

// Stockage en mémoire des contextes par userId
// En production, cela pourrait être Redis ou une autre solution persistante
const contextStore: Map<string, ConversationContext> = new Map();

// Durée de validité du contexte (5 minutes)
const CONTEXT_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Crée un contexte vide
 */
function createEmptyContext(): ConversationContext {
  return {
    lastProjectIds: [],
    lastProjectNames: [],
    lastProjectCount: 0,
    lastFilters: {},
    lastActionType: null,
    lastActionTimestamp: 0,
    lastStatusFilter: null,
  };
}

/**
 * Récupère le contexte d'un utilisateur
 * Retourne un contexte vide si expiré ou inexistant
 */
export function getConversationContext(userId: string): ConversationContext {
  const context = contextStore.get(userId);

  if (!context) {
    return createEmptyContext();
  }

  // Vérifier expiration
  const now = Date.now();
  if (now - context.lastActionTimestamp > CONTEXT_EXPIRY_MS) {
    contextStore.delete(userId);
    return createEmptyContext();
  }

  return context;
}

/**
 * Met à jour le contexte d'un utilisateur après une action
 */
export function updateConversationContext(
  userId: string,
  update: Partial<ConversationContext>
): void {
  const existingContext = contextStore.get(userId) || createEmptyContext();

  const newContext: ConversationContext = {
    ...existingContext,
    ...update,
    lastActionTimestamp: Date.now(),
  };

  contextStore.set(userId, newContext);

  console.log('[ConversationMemory] Contexte mis à jour pour', userId, {
    projectCount: newContext.lastProjectCount,
    actionType: newContext.lastActionType,
    filters: Object.keys(newContext.lastFilters),
  });
}

/**
 * Efface le contexte d'un utilisateur
 */
export function clearConversationContext(userId: string): void {
  contextStore.delete(userId);
}

/**
 * Détecte si la requête fait référence au contexte précédent
 * (utilisation de pronoms comme "les", "ceux-là", etc.)
 */
export function detectContextReference(query: string): {
  hasContextReference: boolean;
  referenceType: 'pronoun' | 'demonstrative' | 'implicit' | null;
} {
  const lowerQuery = query.toLowerCase();

  // Pronoms et références au contexte
  const pronounPatterns = [
    // "met les à 80%" - "les" fait référence aux projets précédents
    /(?:met|mets|passe|change|modifie|marque)\s+les\s+(?:à|en|comme)/i,
    // "met-les à 80%"
    /(?:met|mets|passe|change|modifie|marque)-les\s+(?:à|en|comme)/i,
    // "les mettre à 80%"
    /les\s+(?:mettre|passer|changer|modifier|marquer)\s+(?:à|en|comme)/i,
  ];

  // Démonstratifs
  const demonstrativePatterns = [
    // "ceux-là", "ceux-ci"
    /ceux-?(?:là|ci)/i,
    // "ces projets"
    /ces\s+projets?/i,
    // "ces derniers"
    /ces\s+derniers/i,
  ];

  // Références implicites (continuation évidente)
  const implicitPatterns = [
    // "maintenant met à 80%" (sans sujet)
    /^maintenant\s+(?:met|mets|passe|change|modifie|marque)/i,
    // "et met à 80%" (continuation)
    /^et\s+(?:met|mets|passe|change|modifie|marque)/i,
    // "puis met à 80%"
    /^puis\s+(?:met|mets|passe|change|modifie|marque)/i,
    // "ensuite met à 80%"
    /^ensuite\s+(?:met|mets|passe|change|modifie|marque)/i,
    // "après met à 80%"
    /^après\s+(?:met|mets|passe|change|modifie|marque)/i,
  ];

  for (const pattern of pronounPatterns) {
    if (pattern.test(lowerQuery)) {
      return { hasContextReference: true, referenceType: 'pronoun' };
    }
  }

  for (const pattern of demonstrativePatterns) {
    if (pattern.test(lowerQuery)) {
      return { hasContextReference: true, referenceType: 'demonstrative' };
    }
  }

  for (const pattern of implicitPatterns) {
    if (pattern.test(lowerQuery)) {
      return { hasContextReference: true, referenceType: 'implicit' };
    }
  }

  return { hasContextReference: false, referenceType: null };
}

/**
 * Résout une référence contextuelle en utilisant le contexte précédent
 * Retourne les filtres à utiliser basés sur le contexte
 */
export function resolveContextReference(
  userId: string,
  query: string
): {
  resolved: boolean;
  filters: Record<string, any>;
  projectIds: string[];
  message?: string;
} {
  const context = getConversationContext(userId);
  const { hasContextReference, referenceType } = detectContextReference(query);

  if (!hasContextReference) {
    return {
      resolved: false,
      filters: {},
      projectIds: [],
    };
  }

  // Pas de contexte disponible
  if (context.lastProjectCount === 0 || context.lastActionType === null) {
    return {
      resolved: false,
      filters: {},
      projectIds: [],
      message:
        "Je n'ai pas de contexte précédent. Pouvez-vous préciser quels projets vous souhaitez modifier ?",
    };
  }

  // Contexte expiré
  if (Date.now() - context.lastActionTimestamp > CONTEXT_EXPIRY_MS) {
    return {
      resolved: false,
      filters: {},
      projectIds: [],
      message: 'Le contexte a expiré. Pouvez-vous reformuler votre demande ?',
    };
  }

  console.log('[ConversationMemory] Résolution de référence contextuelle:', {
    referenceType,
    lastProjectCount: context.lastProjectCount,
    lastFilters: context.lastFilters,
    lastActionType: context.lastActionType,
  });

  return {
    resolved: true,
    filters: context.lastFilters,
    projectIds: context.lastProjectIds,
    message: `Appliquer aux ${context.lastProjectCount} projet(s) précédemment listés...`,
  };
}

/**
 * Nettoie les contextes expirés (à appeler périodiquement)
 */
export function cleanupExpiredContexts(): void {
  const now = Date.now();
  for (const [userId, context] of contextStore.entries()) {
    if (now - context.lastActionTimestamp > CONTEXT_EXPIRY_MS) {
      contextStore.delete(userId);
    }
  }
}
