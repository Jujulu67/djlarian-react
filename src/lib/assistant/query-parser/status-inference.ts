/**
 * Status Inference Module
 *
 * Centralizes the logic for inferring status from conversation history
 * or last filters when a follow-up command lacks explicit status.
 *
 * Example: "passe les à en cours" after "liste projets annulés" → infer ANNULE
 */

import type { ConversationMessage } from '../conversational/memory-manager';
import { debugLog } from '../utils/debug-logger';

export type ProjectStatus =
  | 'EN_COURS'
  | 'TERMINE'
  | 'ANNULE'
  | 'A_REWORK'
  | 'GHOST_PRODUCTION'
  | 'ARCHIVE';

/**
 * Status patterns for inference from conversation history
 */
const STATUS_PATTERNS: Array<{ pattern: RegExp; status: ProjectStatus }> = [
  { pattern: /annul[ée]s?|cancel/i, status: 'ANNULE' },
  { pattern: /termin[ée]s?|fini|completed/i, status: 'TERMINE' },
  { pattern: /en\s*cours|ongoing|actifs?/i, status: 'EN_COURS' },
  { pattern: /ghost\s*prod|ghostprod/i, status: 'GHOST_PRODUCTION' },
  { pattern: /archiv[ée]s?|archived/i, status: 'ARCHIVE' },
  { pattern: /rework|a_rework/i, status: 'A_REWORK' },
];

/**
 * Check if the query is a follow-up update command that needs status inference
 */
export function isFollowUpUpdateCommand(query: string): boolean {
  return /(?:passe|met|mets?|change|changer|modifie|modifier)\s+(?:les?\s+)(?:projets?\s+)?(?:à|en|comme)/i.test(
    query
  );
}

/**
 * Check if the query has a new status target (e.g., "à EN_COURS")
 */
export function hasNewStatusTarget(query: string): boolean {
  return /(?:à|en|comme)\s+(?:en\s+cours|termin[ée]s?|annul[ée]s?|ghost\s*prod|archiv[ée]s?)/i.test(
    query
  );
}

/**
 * Infer status from lastFilters (priority 1)
 */
export function inferStatusFromLastFilters(
  lastFilters: Record<string, unknown> | undefined
): ProjectStatus | null {
  if (!lastFilters?.status) return null;

  const status = lastFilters.status as ProjectStatus;
  debugLog('status-inference', 'Status inféré depuis lastFilters', {
    inferredStatus: status,
    source: 'lastFilters',
  });
  return status;
}

/**
 * Infer status from conversation history (priority 2)
 * Searches the last 3 user messages for status keywords
 */
export function inferStatusFromHistory(
  conversationHistory: ConversationMessage[] | undefined
): ProjectStatus | null {
  if (!conversationHistory || conversationHistory.length === 0) return null;

  const previousUserMessages = conversationHistory.filter((msg) => msg.role === 'user').slice(-3);

  for (const msg of previousUserMessages) {
    const content = msg.content.toLowerCase();

    for (const { pattern, status } of STATUS_PATTERNS) {
      if (pattern.test(content)) {
        debugLog('status-inference', 'Status inféré depuis historique', {
          inferredStatus: status,
          previousMessage: content.substring(0, 100),
          source: 'conversationHistory',
        });
        return status;
      }
    }
  }

  return null;
}

/**
 * Infer status from available context
 *
 * @param query - The current query
 * @param currentFilters - Currently detected filters
 * @param lastFilters - Filters from the previous query
 * @param conversationHistory - Conversation history
 * @returns The inferred status, or null if no inference possible
 */
export function inferStatusFromContext(
  query: string,
  currentFilters: Record<string, unknown>,
  lastFilters?: Record<string, unknown>,
  conversationHistory?: ConversationMessage[]
): ProjectStatus | null {
  // Only infer if:
  // 1. It's a follow-up update command (e.g., "passe les à EN_COURS")
  // 2. No status filter is already set
  // 3. There's a new status target
  if (!isFollowUpUpdateCommand(query) || currentFilters.status || !hasNewStatusTarget(query)) {
    return null;
  }

  // Priority 1: Use lastFilters
  const fromLastFilters = inferStatusFromLastFilters(lastFilters);
  if (fromLastFilters) return fromLastFilters;

  // Priority 2: Use conversation history
  return inferStatusFromHistory(conversationHistory);
}
