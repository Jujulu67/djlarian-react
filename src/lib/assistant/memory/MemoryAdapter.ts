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
  ChatMessage,
  isChatMessage,
  ActionType,
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
function getSessionStores(sessionId: string): SessionStores {
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
  action.setLastActionType(actionType as ActionType);
  if (affectedIds.length > 0) {
    action.setSelectedProjectIds(affectedIds);
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

  // eslint-disable-next-line no-console -- Debug-only log gated behind ASSISTANT_DEBUG
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
