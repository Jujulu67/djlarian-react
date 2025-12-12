/**
 * Validation et sanitization des entrées pour le parser
 */

// Limites de sécurité
const MAX_QUERY_LENGTH = 10000; // 10KB max pour une requête
const MAX_COLLABS_COUNT = 1000;
const MAX_STYLES_COUNT = 1000;
const MAX_CONVERSATION_HISTORY_LENGTH = 100;

/**
 * Valide et nettoie une requête utilisateur
 */
export function validateAndSanitizeQuery(query: unknown): string {
  // Vérifier que query existe et est une string
  if (!query) {
    throw new Error('Query is required');
  }

  if (typeof query !== 'string') {
    throw new Error('Query must be a string');
  }

  // Vérifier la longueur
  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query too long (max ${MAX_QUERY_LENGTH} characters)`);
  }

  // Nettoyer la requête
  let cleaned = query.trim();

  // Enlever les guillemets en début/fin (uniquement si les deux sont présents)
  // Enlever les guillemets doubles au début
  if (cleaned.startsWith('"')) {
    cleaned = cleaned.slice(1);
  }
  // Enlever les guillemets doubles à la fin
  if (cleaned.endsWith('"')) {
    cleaned = cleaned.slice(0, -1);
  }
  // Enlever les guillemets simples au début
  if (cleaned.startsWith("'")) {
    cleaned = cleaned.slice(1);
  }
  // Enlever les guillemets simples à la fin
  if (cleaned.endsWith("'")) {
    cleaned = cleaned.slice(0, -1);
  }
  cleaned = cleaned.trim();

  // Vérifier que la requête n'est pas vide après nettoyage
  if (cleaned.length === 0) {
    throw new Error('Query cannot be empty');
  }

  // Sanitization basique : enlever les caractères de contrôle dangereux
  // Garder les caractères normaux (lettres, chiffres, ponctuation, espaces)
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return cleaned;
}

/**
 * Valide les paramètres de configuration
 */
export function validateConfig(
  availableCollabs: unknown,
  availableStyles: unknown
): { collabs: string[]; styles: string[] } {
  // Valider availableCollabs
  if (!Array.isArray(availableCollabs)) {
    throw new Error('availableCollabs must be an array');
  }

  if (availableCollabs.length > MAX_COLLABS_COUNT) {
    throw new Error(`Too many collabs (max ${MAX_COLLABS_COUNT})`);
  }

  const collabs = availableCollabs
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  // Valider availableStyles
  if (!Array.isArray(availableStyles)) {
    throw new Error('availableStyles must be an array');
  }

  if (availableStyles.length > MAX_STYLES_COUNT) {
    throw new Error(`Too many styles (max ${MAX_STYLES_COUNT})`);
  }

  const styles = availableStyles
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return { collabs, styles };
}

/**
 * Valide l'historique de conversation
 */
export function validateConversationHistory(
  history: unknown
): Array<{ role: string; content: string }> | undefined {
  if (history === undefined || history === null) {
    return undefined;
  }

  if (!Array.isArray(history)) {
    throw new Error('conversationHistory must be an array');
  }

  if (history.length > MAX_CONVERSATION_HISTORY_LENGTH) {
    // Limiter à MAX_CONVERSATION_HISTORY_LENGTH messages
    history = history.slice(-MAX_CONVERSATION_HISTORY_LENGTH);
  }

  // Type the history array after slicing
  const validHistory = history as Array<Record<string, unknown>>;

  return validHistory
    .filter((msg: Record<string, unknown>) => {
      if (!msg || typeof msg !== 'object') return false;
      if (msg.role !== 'user' && msg.role !== 'assistant') return false;
      if (!msg.content || typeof msg.content !== 'string') return false;
      if ((msg.content as string).trim().length === 0) return false;
      if ((msg.content as string).length > MAX_QUERY_LENGTH) return false; // Limiter la longueur de chaque message
      return true;
    })
    .map((msg: Record<string, unknown>) => ({
      role: msg.role as string,
      content: (msg.content as string).trim(),
    }));
}

/**
 * Valide les filtres de la dernière requête
 */
export function validateLastFilters(filters: unknown): Record<string, any> | undefined {
  if (filters === undefined || filters === null) {
    return undefined;
  }

  if (typeof filters !== 'object' || Array.isArray(filters)) {
    throw new Error('lastFilters must be an object');
  }

  // Valider que les valeurs sont de types acceptables
  const validated: Record<string, any> = {};
  for (const [key, value] of Object.entries(filters)) {
    // Accepter seulement les types primitifs et les objets simples
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      (Array.isArray(value) && value.every((v) => typeof v === 'string'))
    ) {
      validated[key] = value;
    }
  }

  return validated;
}
