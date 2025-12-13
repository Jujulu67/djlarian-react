/**
 * Lightweight heuristic to infer operational mode from user query
 * No ML, pure pattern matching
 *
 * Deterministic mode inference prevents hallucinated future actions and improves
 * summary faithfulness under limited memory constraints of 8B models.
 */

export type Mode = 'CHAT' | 'FACT' | 'SUMMARY' | 'COMMAND';

/**
 * Infers the operational mode from a user query
 * @param query - The user's query string
 * @returns The inferred operational mode
 */
export function InferModeFromQuery(query: string): Mode {
  const lowerQuery = query.toLowerCase().trim();

  // SUMMARY triggers
  // Also detect follow-up requests for more dense summaries
  const summaryPatterns = [
    /résume/i,
    /résumer/i,
    /summary/i,
    /tl[;:]?dr/i,
    /plus\s+dense/i, // "en plus dense" - follow-up summary request
    /encore\s+plus\s+dense/i,
  ];
  if (summaryPatterns.some((pattern) => pattern.test(lowerQuery))) {
    return 'SUMMARY';
  }

  // FACT triggers
  const factPatterns = [/analyse/i, /extrais/i, /liste\s+les\s+faits/i, /facts\s+only/i];
  if (factPatterns.some((pattern) => pattern.test(lowerQuery))) {
    return 'FACT';
  }

  // COMMAND triggers
  // Must check for "ne fais rien" / "ne fais encore rien" and confirmation requests
  const commandPatterns = [
    /ne\s+fais\s+(encore\s+)?rien/i,
    /dis[-\s]moi\s+(simplement\s+)?(quand\s+)?(tu\s+as\s+)?(terminé|fini)/i,
    /do\s+nothing/i,
    /execute/i,
    /mets?\s+à\s+jour/i,
    /modifie/i,
  ];
  if (commandPatterns.some((pattern) => pattern.test(lowerQuery))) {
    return 'COMMAND';
  }

  // Default: CHAT
  return 'CHAT';
}
