/**
 * Types centraux pour l'architecture mémoire étanche
 *
 * RÈGLE D'OR:
 * - ConversationMemory: chat généraliste uniquement (→ Groq)
 * - ActionMemory: contexte opérationnel uniquement (→ Parser)
 * - UI Transcript: tout (affichage utilisateur)
 */

// ============================================================================
// Message Types
// ============================================================================

/** Discriminant strict pour le type de message */
export type MessageKind = 'chat' | 'action' | 'system';

/** Rôle dans la conversation (compatible Groq) */
export type MessageRole = 'user' | 'assistant' | 'system';

/** Message de base avec kind discriminant */
export interface BaseMessage {
  id: string;
  timestamp: number;
  sessionId: string;
}

/** Message de chat (peut aller dans ConversationMemory) */
export interface ChatMessage extends BaseMessage {
  kind: 'chat';
  role: MessageRole;
  content: string;
  /** Tokens estimés pour ce message */
  tokenEstimate?: number;
}

/** Message d'action (JAMAIS dans ConversationMemory) */
export interface ActionMessage extends BaseMessage {
  kind: 'action';
  role: 'user' | 'assistant';
  /** Commande originale de l'utilisateur */
  command: string;
  /** Type d'action exécutée */
  actionType: ActionType;
  /** Résultat de l'action (pour affichage UI) */
  result?: ActionResult;
}

/** Message système (pour UI uniquement) */
export interface SystemMessage extends BaseMessage {
  kind: 'system';
  role: 'system';
  content: string;
  severity: 'info' | 'warning' | 'error';
}

/** Union de tous les types de messages */
export type Message = ChatMessage | ActionMessage | SystemMessage;

// ============================================================================
// Router Types
// ============================================================================

/** Décision du router */
export type RouterDecision = 'GENERAL_CHAT' | 'ACTION_COMMAND' | 'AMBIGUOUS';

/** Résultat complet du routing */
export interface RouterResult {
  decision: RouterDecision;
  /** Confiance de la décision (0-1) */
  confidence: number;
  /** Raison de la décision (pour debug) */
  reason: string;
  /** Action type détecté si ACTION_COMMAND */
  detectedActionType?: ActionType;
  /** Paramètres extraits si ACTION_COMMAND */
  extractedParams?: Record<string, unknown>;
}

// ============================================================================
// Action Types
// ============================================================================

/** Types d'actions supportées */
export type ActionType =
  | 'LIST'
  | 'UPDATE'
  | 'DELETE'
  | 'CREATE'
  | 'NOTE'
  | 'DEADLINE'
  | 'PRIORITY'
  | 'TAG'
  | 'STATUS'
  | 'FILTER'
  | 'SEARCH'
  | 'HELP'
  | 'UNKNOWN';

/** Résultat d'une action */
export interface ActionResult {
  success: boolean;
  /** Message court pour l'utilisateur */
  message: string;
  /** Données retournées (listings, etc.) - JAMAIS dans ConversationMemory */
  data?: unknown;
  /** Nombre d'éléments affectés */
  affectedCount?: number;
  /** Erreur si échec */
  error?: string;
}

// ============================================================================
// Action Context (ActionMemory content)
// ============================================================================

/** Contexte opérationnel pour le parser d'actions */
export interface ActionContext {
  /** IDs des projets sélectionnés récemment */
  lastSelectedProjectIds: string[];
  /** Dernier filtre appliqué */
  lastQueryFilter: QueryFilter | null;
  /** Dernier type d'action exécuté */
  lastActionType: ActionType | null;
  /** Scope actuel (all, selected, filtered) */
  lastScope: ActionScope;
  /** Confirmation en attente */
  pendingConfirmation: PendingConfirmation | null;
  /** Curseur pour pagination */
  cursor: string | null;
  /** Timestamp de dernière activité */
  lastActivityAt: number;
}

/** Portée de l'action */
export type ActionScope = 'all' | 'selected' | 'filtered' | 'single';

/** Confirmation en attente */
export interface PendingConfirmation {
  actionType: ActionType;
  targetIds: string[];
  description: string;
  expiresAt: number;
}

/** Filtre de requête */
export interface QueryFilter {
  status?: string[];
  priority?: string[];
  tags?: string[];
  search?: string;
  dateRange?: { start: Date; end: Date };
}

// ============================================================================
// Groq Types
// ============================================================================

/** Message formaté pour l'API Groq */
export interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Payload complet pour Groq */
export interface GroqPayload {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  /** @deprecated Utiliser max_completion_tokens à la place (O2) */
  max_tokens?: number;
  /** Nouveau paramètre Groq (remplace max_tokens) */
  max_completion_tokens?: number;
  stream?: boolean;
}

// ============================================================================
// Store Types
// ============================================================================

/** Options pour ConversationMemoryStore */
export interface ConversationMemoryOptions {
  maxMessages: number;
  maxTokens: number;
  sessionId: string;
  userId?: string;
}

/** Options pour ActionMemoryStore */
export interface ActionMemoryOptions {
  ttlMs: number;
  sessionId: string;
  userId?: string;
}

// ============================================================================
// Debug Types
// ============================================================================

/** Log structuré pour debug */
export interface DebugLog {
  requestId: string;
  timestamp: number;
  sessionId: string;
  routeDecision: RouterDecision;
  conversationMemorySize: number;
  actionMemorySnapshot: Partial<ActionContext>;
  groqPayloadPreview?: {
    messageCount: number;
    totalTokens: number;
    lastMessages: Array<{ role: string; contentPreview: string }>;
  };
  violations: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

/** Type guard pour ChatMessage */
export function isChatMessage(msg: Message): msg is ChatMessage {
  return msg.kind === 'chat';
}

/** Type guard pour ActionMessage */
export function isActionMessage(msg: Message): msg is ActionMessage {
  return msg.kind === 'action';
}

/** Type guard pour SystemMessage */
export function isSystemMessage(msg: Message): msg is SystemMessage {
  return msg.kind === 'system';
}

/** Génère un ID unique */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
