/**
 * Utilitaires pour sanitizer les logs et éviter l'exposition de données sensibles
 *
 * Patterns à nettoyer :
 * - Emails
 * - Tokens (JWT, API keys, etc.)
 * - Numéros de carte bancaire
 * - Numéros de téléphone
 * - URLs avec credentials
 */

/**
 * Sanitize une chaîne de caractères en masquant les données sensibles
 */
export function sanitizeForLogs(text: string, maxLength: number = 200): string {
  if (!text || typeof text !== 'string') {
    return String(text || '');
  }

  let sanitized = text;

  // Tronquer d'abord pour éviter de traiter des chaînes énormes
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...[truncated]';
  }

  // Masquer les emails
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[email-redacted]'
  );

  // Masquer les tokens JWT (format: xxxxx.yyyyy.zzzzz)
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    '[token-redacted]'
  );

  // Masquer les API keys communes (patterns comme "sk-", "pk_", "Bearer ", etc.)
  sanitized = sanitized.replace(
    /\b(sk-|pk_|Bearer\s+)[A-Za-z0-9_-]{20,}\b/gi,
    '[api-key-redacted]'
  );

  // Masquer les URLs avec credentials (http://user:pass@host)
  sanitized = sanitized.replace(
    /https?:\/\/[^:]+:[^@]+@[^\s]+/gi,
    '[url-with-credentials-redacted]'
  );

  // Masquer les numéros de carte bancaire (16 chiffres avec ou sans espaces/tirets)
  sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[card-redacted]');

  // Masquer les numéros de téléphone (formats variés)
  sanitized = sanitized.replace(
    /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    '[phone-redacted]'
  );

  return sanitized;
}

/**
 * Sanitize un objet pour les logs (récursif)
 */
export function sanitizeObjectForLogs(obj: unknown, maxStringLength: number = 200): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeForLogs(obj, maxStringLength);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectForLogs(item, maxStringLength));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Ne pas sanitizer certaines clés qui sont sûres (comme des IDs, counts, etc.)
    const safeKeys = ['id', 'count', 'length', 'index', 'type', 'status', 'progress'];
    if (safeKeys.includes(key.toLowerCase()) && typeof value !== 'string') {
      sanitized[key] = value;
    } else {
      sanitized[key] = sanitizeObjectForLogs(value, maxStringLength);
    }
  }

  return sanitized;
}
