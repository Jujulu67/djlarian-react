/**
 * Index - Exports publics du module memory
 *
 * INVARIANT I2: Le "MessageClassifier" ici est un classificateur de messages,
 * PAS le routeur de commandes (qui est dans router/router.ts).
 *
 * INVARIANT I5: Protection concurrence via SessionLock (O5).
 *
 * O6: ModelLimits - Limites officielles par modèle Groq
 * O8: SanitizeGroqMessages - Validation stricte des messages Groq
 */

export * from './Types';
export * from './ConversationMemoryStore';
export * from './ActionMemoryStore';
// Renommé: Router → MessageClassifier (clarification I2)
export * from './MessageClassifier';
export * from './GroqPayloadBuilder';
export * from './ActionParser';
export {
  handleUserInput,
  type HandleUserInputOptions,
  type HandleUserInputResult,
} from './HandleUserInput';

// O6: Limites modèle officielles
export {
  ModelContextTokens,
  ModelMaxOutputTokens,
  getModelContextLimit,
  getModelMaxOutput,
  capMaxCompletionTokens,
  getBoundedResponseReserve,
  validateModelLimits,
} from './ModelLimits';

// O8: Sanitization des messages Groq
export {
  sanitizeGroqMessages,
  validateGroqMessages,
  createValidGroqMessage,
  type ValidGroqMessage,
  type SanitizeResult,
  type SanitizeIssue,
  type SanitizeOptions,
} from './SanitizeGroqMessages';

// O5: Lock de concurrence par session
export {
  withSessionLock,
  hasInflight,
  getInflightCount,
  assertNoDoubleInflight,
  resetSessionLocks,
} from './SessionLock';

// Adaptateur pour intégration avec le code existant
export {
  getSessionStores,
  clearSessionStores,
  classifyUserMessage, // ⚠️ À utiliser uniquement pour décision mémoire, PAS pour routing (I2)
  trackChatMessage,
  trackActionContext,
  setPendingConfirmation,
  getFilteredConversationHistory,
  getConversationMemorySize,
  getActionContext,
  validateMemoryInvariants,
  resetSession,
  debugMemoryState,
  type MessageClassification,
} from './MemoryAdapter';
