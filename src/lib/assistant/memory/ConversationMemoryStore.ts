/**
 * ConversationMemoryStore
 *
 * Stocke UNIQUEMENT les messages de chat généraliste (kind='chat').
 * Utilisé exclusivement pour construire le payload Groq.
 *
 * INTERDICTIONS:
 * - Stocker des résultats d'actions
 * - Stocker des listings ou dumps JSON
 * - Stocker des confirmations d'actions
 */

import {
  ChatMessage,
  ConversationMemoryOptions,
  Message,
  MessageRole,
  generateId,
  isChatMessage,
} from './Types';

/** Estimation tokens par caractère (approximation pour Llama) */
const CHARS_PER_TOKEN = 4;

/**
 * PATTERNS D'OUTPUTS D'ACTIONS (O3 - Refactored)
 *
 * RÈGLE IMPORTANTE: Ne PAS filtrer les mots techniques isolés!
 * "Explique Prisma" ou "C'est quoi SQL?" sont des questions légitimes.
 *
 * On filtre UNIQUEMENT:
 * - Les outputs structurés d'actions (JSON avec données projet)
 * - Les messages de confirmation d'actions ("J'ai trouvé X projets...")
 * - Les listings/tableaux de données
 */
const ACTION_OUTPUT_PATTERNS_ASSISTANT = [
  // JSON arrays avec structure projet (pas juste ```json)
  /\[[\s\S]*\{[\s\S]*"id"[\s\S]*"name"[\s\S]*\}[\s\S]*\]/,
  /```json[\s\S]*"(id|projectId|affectedProjectIds)"[\s\S]*```/i,
  // Résultats d'actions avec comptage
  /\d+ projets? (mis à jour|supprimé|créé|listé|trouvé)/i,
  /J'ai (trouvé|mis|supprimé|créé) \d+ projet/i,
  /Ok\.\s*J'ai mis \d+ projet/i,
  // Champs techniques d'output d'actions (pas juste le mot)
  /"affectedRows"\s*:\s*\d+/i,
  /"affectedProjectIds"\s*:\s*\[/i,
  /"pendingAction"\s*:\s*\{/i,
  /"success"\s*:\s*(true|false),?\s*"(message|data)"/i,
  // Tableaux ASCII de listings avec structure
  /\|[-=]+\|[\s\S]+\|[-=]+\|/,
  /^\s*\|\s*ID\s*\|\s*Nom\s*\|/im,
];

/** Patterns pour les messages user (éviter seulement les injections) */
const USER_INJECTION_PATTERNS = [
  // Injection de résultats JSON purs
  /^\s*\[\s*\{[\s\S]*"id"[\s\S]*\}\s*\]\s*$/,
];

export class ConversationMemoryStore {
  private messages: ChatMessage[] = [];
  private readonly options: Required<ConversationMemoryOptions>;

  constructor(options: ConversationMemoryOptions) {
    this.options = {
      maxMessages: options.maxMessages || 50,
      maxTokens: options.maxTokens || 4000,
      sessionId: options.sessionId,
      userId: options.userId || 'anonymous',
    };
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Ajoute un message chat à la mémoire.
   * Rejette automatiquement les messages pollués.
   */
  add(role: MessageRole, content: string): ChatMessage | null {
    // Validation: pas de contenu vide
    if (!content || content.trim().length === 0) {
      this.debugLog('REJECTED: empty content');
      return null;
    }

    // Validation: pas de pollution par résultats d'action (O3: contextuel)
    if (this.isPolludedContent(content, role)) {
      this.debugLog(`REJECTED: polluted content detected (role=${role})`);
      if (this.isDebugEnabled()) {
        console.warn('[ConversationMemory] Pollution detected:', content.substring(0, 100));
      }
      return null;
    }

    const message: ChatMessage = {
      id: generateId(),
      kind: 'chat',
      role,
      content: content.trim(),
      timestamp: Date.now(),
      sessionId: this.options.sessionId,
      tokenEstimate: this.estimateTokens(content),
    };

    this.messages.push(message);

    // Trim si nécessaire
    this.enforceTokenBudget();
    this.enforceMessageLimit();

    this.debugLog(`ADDED: ${role} message (${message.tokenEstimate} tokens)`);
    return message;
  }

  /**
   * Ajoute un message uniquement s'il est de type chat.
   * Utilisé pour filtrer automatiquement.
   */
  addIfChat(msg: Message): ChatMessage | null {
    if (!isChatMessage(msg)) {
      this.debugLog(`REJECTED: not a chat message (kind=${msg.kind})`);
      return null;
    }
    return this.add(msg.role, msg.content);
  }

  /**
   * Retourne tous les messages chat (pour Groq).
   */
  getMessages(): readonly ChatMessage[] {
    return Object.freeze([...this.messages]);
  }

  /**
   * Retourne les N derniers messages.
   */
  getLastMessages(count: number): readonly ChatMessage[] {
    return Object.freeze(this.messages.slice(-count));
  }

  /**
   * Retourne le nombre de messages.
   */
  get size(): number {
    return this.messages.length;
  }

  /**
   * Retourne le total estimé de tokens.
   */
  get totalTokens(): number {
    return this.messages.reduce((sum, m) => sum + (m.tokenEstimate || 0), 0);
  }

  /**
   * Vide la mémoire.
   */
  clear(): void {
    const previousSize = this.messages.length;
    this.messages = [];
    this.debugLog(`CLEARED: ${previousSize} messages removed`);
  }

  /**
   * Exporte l'état pour persistance.
   */
  export(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Importe un état sauvegardé (avec validation).
   */
  import(messages: ChatMessage[]): number {
    let importedCount = 0;

    for (const msg of messages) {
      if (msg.kind === 'chat' && !this.isPolludedContent(msg.content)) {
        this.messages.push({
          ...msg,
          sessionId: this.options.sessionId,
        });
        importedCount++;
      }
    }

    this.enforceTokenBudget();
    this.enforceMessageLimit();

    this.debugLog(`IMPORTED: ${importedCount}/${messages.length} messages`);
    return importedCount;
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Vérifie qu'aucun message ne viole les invariants.
   * Throws en mode debug si violation.
   */
  validateInvariants(): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const msg of this.messages) {
      // Invariant 1: kind doit être 'chat'
      if (msg.kind !== 'chat') {
        violations.push(`Message ${msg.id} has invalid kind: ${msg.kind}`);
      }

      // Invariant 2: pas de contenu pollé (O3: contextuel par role)
      if (this.isPolludedContent(msg.content, msg.role)) {
        violations.push(`Message ${msg.id} contains polluted content`);
      }
    }

    // Invariant 3: budget tokens respecté
    if (this.totalTokens > this.options.maxTokens) {
      violations.push(`Token budget exceeded: ${this.totalTokens}/${this.options.maxTokens}`);
    }

    if (violations.length > 0 && this.isDebugEnabled()) {
      console.error('[ConversationMemory] Invariant violations:', violations);
      throw new Error(`ConversationMemory invariant violations: ${violations.join(', ')}`);
    }

    return { valid: violations.length === 0, violations };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Détecte si un contenu est pollé par des outputs d'actions.
   * O3: Détection CONTEXTUELLE selon le rôle.
   * - Messages assistant: filtrage strict (outputs d'actions)
   * - Messages user: filtrage léger (injections seulement)
   */
  private isPolludedContent(content: string, role: MessageRole = 'assistant'): boolean {
    if (role === 'user') {
      // Pour les messages user, on filtre seulement les injections évidentes
      return USER_INJECTION_PATTERNS.some((pattern: RegExp) => pattern.test(content));
    }
    // Pour les messages assistant, filtrage strict
    return ACTION_OUTPUT_PATTERNS_ASSISTANT.some((pattern: RegExp) => pattern.test(content));
  }

  private estimateTokens(content: string): number {
    return Math.ceil(content.length / CHARS_PER_TOKEN);
  }

  private enforceTokenBudget(): void {
    while (this.totalTokens > this.options.maxTokens && this.messages.length > 1) {
      const removed = this.messages.shift();
      this.debugLog(`TRIMMED: old message removed (token budget)`);
    }
  }

  private enforceMessageLimit(): void {
    while (this.messages.length > this.options.maxMessages) {
      const removed = this.messages.shift();
      this.debugLog(`TRIMMED: old message removed (message limit)`);
    }
  }

  private isDebugEnabled(): boolean {
    return process.env.ASSISTANT_DEBUG === 'true';
  }

  private debugLog(message: string): void {
    if (this.isDebugEnabled()) {
      console.log(`[ConversationMemory][${this.options.sessionId}] ${message}`);
    }
  }
}

// ==========================================================================
// Factory
// ==========================================================================

/** Map des stores par session (côté serveur) */
const storeMap = new Map<string, ConversationMemoryStore>();

/**
 * Récupère ou crée un store pour une session.
 */
export function getConversationMemoryStore(
  sessionId: string,
  options?: Partial<ConversationMemoryOptions>
): ConversationMemoryStore {
  const key = sessionId;

  if (!storeMap.has(key)) {
    storeMap.set(
      key,
      new ConversationMemoryStore({
        sessionId,
        maxMessages: options?.maxMessages ?? 50,
        maxTokens: options?.maxTokens ?? 4000,
        userId: options?.userId,
      })
    );
  }

  return storeMap.get(key)!;
}

/**
 * Supprime un store de session.
 */
export function clearConversationMemoryStore(sessionId: string): void {
  storeMap.delete(sessionId);
}
