/**
 * Gestionnaire de mémoire conversationnelle pour l'assistant
 * Implémente une stratégie hybride : fenêtre glissante + résumé intelligent
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

export interface PreparedConversationContext {
  summary?: string;
  recentMessages: ConversationMessage[];
  totalTokens: number;
  factualMemory?: string;
  interpretativeNotes?: string;
}

/**
 * Estimation approximative du nombre de tokens
 * Approximation : 1 token ≈ 4 caractères pour le français/anglais
 */
export function estimateTokens(text: string): number {
  // Approximation simple : 1 token ≈ 4 caractères
  // Pour être plus précis, on pourrait utiliser une librairie, mais cette approximation est suffisante
  return Math.ceil(text.length / 4);
}

/**
 * Tronque un message à une limite de tokens
 */
function truncateMessage(message: string, maxTokens: number): string {
  const maxChars = maxTokens * 4; // Approximation
  if (message.length <= maxChars) return message;
  return message.substring(0, maxChars - 3) + '...';
}

const CONSTRAINT_PATTERN =
  /(?:contrainte|constraint|limite|limit|budget|salaire|€|\$|ans|années|years)/i;

// « je préfère X », « j'aime X », « mon choix est X », « X est mon préféré »…
const PREFERENCE_PATTERNS = [
  /(?:je\s+pr[ée]f[èe]re|j['’]?aime|mon\s+choix|je\s+dirais|je\s+choisirais)\s+([^.!?]+)/i,
  /(?<![^.!?])([^.!?]+)\s+(?:est\s+mon\s+pr[ée]f[èe]r[ée]|est\s+ma\s+pr[ée]f[èe]r[ée]e)/i,
  /(?:pr[ée]f[èe]re|choisirais)\s+(?:l['’]?|le\s+|la\s+)?([^.!?]+)/i,
];

// Mots de liaison en fin de préférence
const PREFERENCE_TAIL_PATTERN =
  /(?<!\s)\s+(car|parce\s+que|car|mais|donc|alors|ensuite|après|avant).*$/i;

const MAX_MEMORY_ITEMS = 5;

const tokensOf = (text?: string) => (text ? estimateTokens(text) : 0);

const isFactual = (text: string) => /\d/.test(text) || CONSTRAINT_PATTERN.test(text);

/** Fait objectif d'un échange (nombres, dates, contraintes). */
function extractFact(question: string, answer: string): string | null {
  if (!isFactual(answer)) return null;
  const factualPart = answer.split(/[.!?]/).filter(isFactual).slice(0, 2).join('. ');
  return factualPart.length > 10 && factualPart.length < 100
    ? `${question} → ${factualPart}`
    : null;
}

function findPreference(answer: string): string | null {
  for (const pattern of PREFERENCE_PATTERNS) {
    const preference = answer
      .match(pattern)?.[1]
      ?.trim()
      .replace(PREFERENCE_TAIL_PATTERN, '')
      .trim();
    if (preference && preference.length > 2 && preference.length < 50) return preference;
  }
  return null;
}

/** Préférence exprimée, ou à défaut un résumé très court s'il n'y a aucun fait. */
function extractNote(question: string, answer: string): string | null {
  const preference = findPreference(answer);
  if (preference) return `${question} → ${preference}`;
  if (isFactual(answer)) return null;
  const firstSentence = answer.split(/[.!?]/)[0].trim();
  return firstSentence.length > 10 && firstSentence.length < 80
    ? `${question} → ${firstSentence}`
    : null;
}

/** Sépare les anciens échanges (user, assistant) en faits et en notes interprétatives. */
function collectMemoryItems(oldMessages: ConversationMessage[]) {
  const factual: string[] = [];
  const interpretative: string[] = [];
  for (let i = 0; i < oldMessages.length - 1; i += 2) {
    if (oldMessages[i].role !== 'user' || oldMessages[i + 1]?.role !== 'assistant') continue;
    const question = truncateMessage(oldMessages[i].content, 40);
    const answer = truncateMessage(oldMessages[i + 1].content, 60);
    const fact = extractFact(question, answer);
    if (fact) factual.push(fact);
    const note = extractNote(question, answer);
    if (note) interpretative.push(note);
  }
  return { factual, interpretative };
}

function joinMemoryItems(items: string[], maxTokens: number): string | undefined {
  if (items.length === 0) return undefined;
  const suffix = items.length > MAX_MEMORY_ITEMS ? '...' : '';
  const joined = items.slice(0, MAX_MEMORY_ITEMS).join(' | ') + suffix;
  return estimateTokens(joined) > maxTokens ? truncateMessage(joined, maxTokens) : joined;
}

/** Ancien format de résumé, quand les échanges ne se séparent pas en faits et notes. */
function buildTopicSummary(oldMessages: ConversationMessage[], maxTokens: number): string {
  const userTopics = oldMessages
    .filter((m) => m.role === 'user')
    .map((m) => truncateMessage(m.content, 50));
  const assistantTopics = oldMessages
    .filter((m) => m.role !== 'user')
    .map((m) => truncateMessage(m.content, 50));
  const userSummary =
    userTopics.length > 0
      ? `L'utilisateur a mentionné : ${userTopics.slice(0, 3).join(', ')}${userTopics.length > 3 ? '...' : ''}`
      : '';
  const assistantSummary =
    assistantTopics.length > 0
      ? `L'assistant a répondu sur : ${assistantTopics.slice(0, 2).join(', ')}${assistantTopics.length > 2 ? '...' : ''}`
      : '';
  const summary = [userSummary, assistantSummary].filter(Boolean).join('. ');
  return estimateTokens(summary) > maxTokens ? truncateMessage(summary, maxTokens) : summary;
}

/** Garde les messages les plus récents qui tiennent dans le budget de tokens. */
function limitRecentMessages(messages: ConversationMessage[], targetTokens: number) {
  let tokens = 0;
  const limited: ConversationMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (tokens + msgTokens > targetTokens) break;
    limited.unshift(messages[i]);
    tokens += msgTokens;
  }
  return { limited, tokens };
}

/**
 * Prépare le contexte conversationnel avec une stratégie hybride
 * - Garde les N derniers messages complets (fenêtre glissante)
 * - Résume les messages plus anciens si nécessaire
 */
export function prepareConversationContext(
  messages: ConversationMessage[],
  maxRecent: number = 12,
  maxSummaryTokens: number = 200,
  maxMessageTokens: number = 150,
  maxTotalTokens: number = 2000
): PreparedConversationContext {
  if (messages.length === 0) {
    return {
      recentMessages: [],
      totalTokens: 0,
    };
  }

  // Réduire à 5 messages récents si on va avoir un summary
  // Optimisé pour les modèles 8B qui gèrent mieux les contextes courts
  const willHaveSummary = messages.length > maxRecent;
  // 5 messages pour les 8B models (plus efficace que 8)
  const effectiveMaxRecent = willHaveSummary ? 5 : Math.min(maxRecent, 8);

  // Séparer les messages récents et anciens
  const recentMessages = messages.slice(-effectiveMaxRecent);
  const oldMessages = messages.slice(0, -effectiveMaxRecent);

  // Tronquer les messages récents si nécessaire
  const truncatedRecent = recentMessages.map((msg) => ({
    ...msg,
    content: truncateMessage(msg.content, maxMessageTokens),
  }));

  // Résumé des messages anciens, séparé en mémoire factuelle et notes interprétatives
  let summary: string | undefined;
  let factualMemory: string | undefined;
  let interpretativeNotes: string | undefined;
  if (oldMessages.length > 0) {
    const items = collectMemoryItems(oldMessages);
    // Chaque section a la moitié du budget du résumé
    factualMemory = joinMemoryItems(items.factual, maxSummaryTokens / 2);
    interpretativeNotes = joinMemoryItems(items.interpretative, maxSummaryTokens / 2);
    if (!factualMemory && !interpretativeNotes) {
      summary = buildTopicSummary(oldMessages, maxSummaryTokens);
    }
  }
  const memoryTokens = tokensOf(summary) + tokensOf(factualMemory) + tokensOf(interpretativeNotes);
  const totalTokens =
    truncatedRecent.reduce((sum, msg) => sum + estimateTokens(msg.content), 0) + memoryTokens;

  // Si on dépasse la limite totale, réduire le nombre de messages récents
  if (totalTokens > maxTotalTokens) {
    const { limited, tokens } = limitRecentMessages(
      truncatedRecent,
      maxTotalTokens - tokensOf(summary)
    );
    return {
      summary,
      recentMessages: limited,
      totalTokens: tokens + memoryTokens,
      factualMemory,
      interpretativeNotes,
    };
  }

  return {
    summary,
    recentMessages: truncatedRecent,
    totalTokens,
    factualMemory,
    interpretativeNotes,
  };
}

/**
 * Formate le contexte pour le prompt Groq
 * Reorganizes memory into FACTUAL MEMORY and INTERPRETATIVE NOTES sections
 *
 * CRITICAL: Sections must be explicitly labeled and NOT merged.
 * RECENT EXCHANGE is limited to max 8 messages when summary exists (handled in prepareConversationContext).
 * This formatting ensures 8B models can reliably distinguish between factual and interpretative memory.
 */
export function formatConversationContextForPrompt(
  context: PreparedConversationContext,
  currentQuery: string
): string {
  const parts: string[] = [];

  // FACTUAL MEMORY section (explicitly labeled, not merged with other sections)
  if (context.factualMemory) {
    parts.push('FACTUAL MEMORY:');
    parts.push(context.factualMemory);
    parts.push('');
  }

  // INTERPRETATIVE NOTES section (explicitly labeled, separate from factual memory)
  if (context.interpretativeNotes) {
    parts.push('INTERPRETATIVE NOTES:');
    parts.push(context.interpretativeNotes);
    parts.push('');
  }

  // Fallback to old summary format if new format not available (backward compatibility)
  if (context.summary && !context.factualMemory && !context.interpretativeNotes) {
    parts.push('FACTUAL MEMORY:');
    parts.push(context.summary);
    parts.push('');
  }

  // RECENT EXCHANGE (max 6 messages when summary exists, handled upstream)
  if (context.recentMessages.length > 0) {
    parts.push('RECENT EXCHANGE:');
    context.recentMessages.forEach((msg) => {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      parts.push(`${roleLabel}: ${msg.content}`);
    });
    parts.push('');
  }

  // Current question is included here for proper ordering in prompt assembly
  parts.push(`QUESTION: "${currentQuery}"`);

  return parts.join('\n');
}
