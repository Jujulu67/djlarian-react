/**
 * Adaptateur pour intégrer la nouvelle architecture mémoire étanche
 * avec le système existant de useAssistantChat
 *
 * Usage:
 * 1. Importer cet adaptateur dans useAssistantChat
 * 2. Utiliser getFilteredConversationHistory() avant d'appeler Groq
 * 3. Utiliser trackMessage() après chaque échange
 *
 * INVARIANT I2: classifyUserMessage est pour la classification mémoire UNIQUEMENT.
 * Le routing réel est fait par router/router.ts.
 */

import {
  ConversationMemoryStore,
  ActionMemoryStore,
  Router as MessageClassifier, // Renommé pour clarifier (I2)
  RouterResult,
  ChatMessage,
  isChatMessage,
} from './index';

// =============================================================================
// Session Manager - Singleton par session
// =============================================================================

interface SessionStores {
  conversation: ConversationMemoryStore;
  action: ActionMemoryStore;
  classifier: MessageClassifier; // Renommé: router → classifier (I2)
}

const sessionStores = new Map<string, SessionStores>();

/**
 * Récupère ou crée les stores pour une session
 */
export function getSessionStores(sessionId: string): SessionStores {
  if (!sessionStores.has(sessionId)) {
    sessionStores.set(sessionId, {
      conversation: new ConversationMemoryStore({
        sessionId,
        maxMessages: 50,
        maxTokens: 4000,
      }),
      action: new ActionMemoryStore({
        sessionId,
        ttlMs: 30 * 60 * 1000, // 30 minutes
      }),
      classifier: new MessageClassifier(), // Renommé (I2)
    });
  }
  return sessionStores.get(sessionId)!;
}

/**
 * Nettoie les stores d'une session
 */
export function clearSessionStores(sessionId: string): void {
  sessionStores.delete(sessionId);
}

// =============================================================================
// Message Classification - Pour la décision mémoire (PAS pour le routing - I2)
// =============================================================================

export type MessageClassification = 'chat' | 'action' | 'ambiguous';

/**
 * Classifie un message utilisateur pour décider dans quelle mémoire il va.
 *
 * ⚠️ DÉPRÉCIÉ pour le routing - utiliser router/router.ts à la place.
 *
 * Cette fonction ne doit être utilisée QUE pour:
 * - Décider si un message va dans ConversationMemory
 * - Debug/logs
 *
 * Le vrai routing (LIST, UPDATE, CREATE, GENERAL) est fait par router/router.ts.
 *
 * @deprecated Pour le routing, utiliser routeProjectCommand de router/router.ts
 */
export function classifyUserMessage(
  sessionId: string,
  input: string
): RouterResult & { classification: MessageClassification } {
  // 🔒 Assertion anti-double-routing
  if (process.env.ASSISTANT_DEBUG === 'true') {
    console.warn(
      '[MemoryAdapter] ⚠️ classifyUserMessage appelé - ceci est pour classification mémoire UNIQUEMENT, pas pour routing.'
    );
  }

  const { classifier, action } = getSessionStores(sessionId);
  const pendingConfirmation = action.getPendingConfirmation();

  const result = classifier.route(input, !!pendingConfirmation);

  const classification: MessageClassification =
    result.decision === 'GENERAL_CHAT'
      ? 'chat'
      : result.decision === 'ACTION_COMMAND'
        ? 'action'
        : 'ambiguous';

  return { ...result, classification };
}

// =============================================================================
// Memory Tracking - Pour l'isolation
// =============================================================================

/**
 * Enregistre un message utilisateur de type chat dans ConversationMemory
 * NE PAS appeler pour les commandes actions!
 */
export function trackChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): ChatMessage | null {
  const { conversation } = getSessionStores(sessionId);
  return conversation.add(role, content);
}

/**
 * Enregistre une action dans ActionMemory (sans texte)
 */
export function trackActionContext(
  sessionId: string,
  actionType: string,
  affectedIds: string[] = []
): void {
  const { action } = getSessionStores(sessionId);
  action.setLastActionType(actionType as any);
  if (affectedIds.length > 0) {
    action.setSelectedProjectIds(affectedIds);
  }
}

/**
 * Met à jour la confirmation en attente
 */
export function setPendingConfirmation(
  sessionId: string,
  confirmation: { actionType: string; targetIds: string[]; description: string } | null
): void {
  const { action } = getSessionStores(sessionId);
  if (confirmation) {
    action.setPendingConfirmation({
      actionType: confirmation.actionType as any,
      targetIds: confirmation.targetIds,
      description: confirmation.description,
    });
  } else {
    action.setPendingConfirmation(null);
  }
}

// =============================================================================
// Groq Integration - Historique filtré
// =============================================================================

/**
 * Retourne l'historique conversationnel FILTRÉ pour Groq
 * Exclut automatiquement les résultats d'actions
 */
export function getFilteredConversationHistory(
  sessionId: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const { conversation } = getSessionStores(sessionId);

  return conversation.getMessages().map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));
}

/**
 * Retourne le nombre de messages dans ConversationMemory
 */
export function getConversationMemorySize(sessionId: string): number {
  const { conversation } = getSessionStores(sessionId);
  return conversation.size;
}

/**
 * Retourne le contexte action actuel
 */
export function getActionContext(sessionId: string) {
  const { action } = getSessionStores(sessionId);
  return action.getContext();
}

// =============================================================================
// Validation - Pour debug
// =============================================================================

/**
 * Valide les invariants des deux mémoires
 * Throw en mode debug si violation
 */
export function validateMemoryInvariants(sessionId: string): {
  conversationValid: boolean;
  actionValid: boolean;
  violations: string[];
} {
  const { conversation, action } = getSessionStores(sessionId);

  const convResult = conversation.validateInvariants();
  const actionResult = action.validateInvariants();

  return {
    conversationValid: convResult.valid,
    actionValid: actionResult.valid,
    violations: [...convResult.violations, ...actionResult.violations],
  };
}

/**
 * Reset complet de la session (conversation + action)
 */
export function resetSession(sessionId: string): void {
  const stores = sessionStores.get(sessionId);
  if (stores) {
    stores.conversation.clear();
    stores.action.reset();
  }
}

// =============================================================================
// Debug helpers
// =============================================================================

/**
 * Log l'état actuel des mémoires (si debug activé)
 */
export function debugMemoryState(sessionId: string): void {
  if (process.env.ASSISTANT_DEBUG !== 'true') return;

  const { conversation, action } = getSessionStores(sessionId);

  console.log(`[MemoryAdapter][${sessionId}] État mémoires:`, {
    conversationSize: conversation.size,
    conversationTokens: conversation.totalTokens,
    actionContext: {
      lastActionType: action.getContext().lastActionType,
      selectedIds: action.getContext().lastSelectedProjectIds.length,
      scope: action.getContext().lastScope,
      hasPending: !!action.getPendingConfirmation(),
    },
  });
}
