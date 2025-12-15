/**
 * PiiRedactor - Redaction des données personnelles identifiables
 *
 * O13: Protection contre la fuite de PII dans les logs et debug.
 *
 * PATTERNS DÉTECTÉS:
 * - Emails (format standard)
 * - Numéros de téléphone (formats FR/US/internationaux)
 * - Numéros de carte bancaire (13-19 digits)
 * - API keys / Tokens (patterns courants)
 * - IBANs (format international)
 *
 * USAGE:
 * ```typescript
 * const safe = redactPii("Contact: john@example.com, +33612345678");
 * // → "Contact: [EMAIL], [PHONE]"
 * ```
 */

// ============================================================================
// Patterns de détection PII
// ============================================================================

/**
 * Pattern pour les emails.
 * Couvre la plupart des formats valides RFC 5322.
 */
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

/**
 * Pattern pour les numéros de carte bancaire (13-19 digits).
 * Couvre: 4111 1111 1111 1111, 4111-1111-1111-1111, 4111111111111111
 *
 * Note: Doit être appliqué AVANT les patterns de téléphone pour éviter les conflits.
 */
const CARD_NUMBER_PATTERN = /\b(?:\d{4}[\s.-]?){3}\d{1,4}\b/g;

/**
 * Pattern pour les numéros de téléphone.
 * Couvre: +33 6 12 34 56 78, 06.12.34.56.78, (555) 123-4567, etc.
 *
 * Note: Appliqué APRÈS les cartes bancaires.
 */
const PHONE_PATTERNS = [
  // Format international: +33 6 12 34 56 78 ou +33612345678 (doit commencer par +)
  /\+\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}/g,
  // Format FR: 06 12 34 56 78 ou 06.12.34.56.78 ou 0612345678 (doit commencer par 0)
  /\b0[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
  // Format US: (555) 123-4567 ou 555-123-4567 (doit avoir parenthèse ou tiret)
  /\(\d{3}\)[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  /\b\d{3}-\d{3}-\d{4}\b/g,
];

/**
 * Patterns pour les API keys et tokens.
 * Couvre les formats courants: sk-..., pk-..., Bearer xyz, etc.
 */
const API_KEY_PATTERNS = [
  // OpenAI style: sk-... ou pk-...
  /\b(sk|pk|api)[-_]?[A-Za-z0-9]{20,}\b/gi,
  // Bearer tokens longs
  /\bBearer\s+[A-Za-z0-9_-]{20,}\b/gi,
  // Generic long hex/base64 tokens (40+ chars)
  /\b[A-Fa-f0-9]{40,}\b/g,
  // JWT patterns (xxx.yyy.zzz)
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  // Groq API key pattern: gsk_...
  /\bgsk_[A-Za-z0-9]{50,}\b/g,
];

/**
 * Pattern pour les IBANs.
 */
const IBAN_PATTERN = /\b[A-Z]{2}\d{2}[\sA-Z0-9]{11,30}\b/g;

/**
 * Pattern pour les numéros de sécurité sociale FR.
 * Format: 1 85 12 75 115 001 23
 */
const SSN_FR_PATTERN = /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g;

// ============================================================================
// Fonction principale
// ============================================================================

export interface RedactedResult {
  /** Texte avec PII remplacés par des tags */
  text: string;
  /** Nombre de redactions effectuées */
  redactionCount: number;
  /** Types de PII détectés */
  detectedTypes: PiiType[];
}

export type PiiType = 'EMAIL' | 'PHONE' | 'CARD' | 'API_KEY' | 'IBAN' | 'SSN';

/**
 * Redactes les données personnelles d'un texte.
 *
 * @param text Texte à nettoyer
 * @param options Options de redaction (optionnel)
 * @returns Texte avec PII remplacés par des tags [EMAIL], [PHONE], etc.
 */
export function redactPii(text: string): string;
export function redactPii(text: string, options: { returnDetails?: false }): string;
export function redactPii(text: string, options: { returnDetails: true }): RedactedResult;
export function redactPii(
  text: string,
  options?: { returnDetails?: boolean }
): string | RedactedResult {
  if (!text || typeof text !== 'string') {
    return options?.returnDetails ? { text: '', redactionCount: 0, detectedTypes: [] } : '';
  }

  let result = text;
  let redactionCount = 0;
  const detectedTypes: Set<PiiType> = new Set();

  // Emails (premier car pas de conflit)
  const emailMatches = result.match(EMAIL_PATTERN);
  if (emailMatches) {
    result = result.replace(EMAIL_PATTERN, '[EMAIL]');
    redactionCount += emailMatches.length;
    detectedTypes.add('EMAIL');
  }

  // IBANs (AVANT cartes car ils contiennent des séquences de chiffres)
  const ibanMatches = result.match(IBAN_PATTERN);
  if (ibanMatches) {
    result = result.replace(IBAN_PATTERN, '[IBAN]');
    redactionCount += ibanMatches.length;
    detectedTypes.add('IBAN');
  }

  // SSN FR (AVANT cartes pour éviter les conflits)
  const ssnMatches = result.match(SSN_FR_PATTERN);
  if (ssnMatches) {
    result = result.replace(SSN_FR_PATTERN, '[SSN]');
    redactionCount += ssnMatches.length;
    detectedTypes.add('SSN');
  }

  // Cartes bancaires (AVANT téléphones car 16 digits peuvent être matchés par phone patterns)
  const cardMatches = result.match(CARD_NUMBER_PATTERN);
  if (cardMatches) {
    result = result.replace(CARD_NUMBER_PATTERN, '[CARD]');
    redactionCount += cardMatches.length;
    detectedTypes.add('CARD');
  }

  // Phones (APRÈS cartes pour éviter les faux positifs)
  for (const pattern of PHONE_PATTERNS) {
    const phoneMatches = result.match(pattern);
    if (phoneMatches) {
      result = result.replace(pattern, '[PHONE]');
      redactionCount += phoneMatches.length;
      detectedTypes.add('PHONE');
    }
  }

  // API Keys
  for (const pattern of API_KEY_PATTERNS) {
    const keyPattern = new RegExp(pattern.source, pattern.flags);
    const keyMatches = result.match(keyPattern);
    if (keyMatches) {
      result = result.replace(keyPattern, '[API_KEY]');
      redactionCount += keyMatches.length;
      detectedTypes.add('API_KEY');
    }
  }

  if (options?.returnDetails) {
    return {
      text: result,
      redactionCount,
      detectedTypes: Array.from(detectedTypes),
    };
  }

  return result;
}

// ============================================================================
// Garde-fou Debug en Production
// ============================================================================

/**
 * Vérifie si le debug est autorisé dans l'environnement actuel.
 *
 * O13 - Garde-fou:
 * - NODE_ENV !== 'production' → debug autorisé
 * - NODE_ENV === 'production' + ASSISTANT_DEBUG_ALLOW_IN_PROD=true → debug autorisé
 * - NODE_ENV === 'production' sans flag → debug IGNORÉ
 */
export function isDebugAllowed(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  const debugRequested = process.env.ASSISTANT_DEBUG === 'true';
  const allowInProd = process.env.ASSISTANT_DEBUG_ALLOW_IN_PROD === 'true';

  // En production, debug seulement si explicitement autorisé
  if (nodeEnv === 'production') {
    return debugRequested && allowInProd;
  }

  // Hors production, suivre ASSISTANT_DEBUG
  return debugRequested;
}

/**
 * Log sécurisé avec redaction PII et garde-fou production.
 *
 * @param category Catégorie du log (ex: 'GroqPayload', 'Router')
 * @param message Message à logger
 * @param data Données additionnelles (seront redactées)
 */
export function safeDebugLog(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!isDebugAllowed()) {
    return;
  }

  const prefix = `[${category}]`;
  const redactedMessage = redactPii(message);

  if (data) {
    // Redacter toutes les valeurs string dans data
    const redactedData = redactObject(data);
    console.log(prefix, redactedMessage, redactedData);
  } else {
    console.log(prefix, redactedMessage);
  }
}

/**
 * Redacte récursivement les strings dans un objet.
 */
export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = redactPii(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) =>
        typeof v === 'string'
          ? redactPii(v)
          : typeof v === 'object' && v !== null
            ? redactObject(v as Record<string, unknown>)
            : v
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ============================================================================
// Validation des patterns (pour tests)
// ============================================================================

/**
 * Teste si un texte contient des PII détectables.
 */
export function containsPii(text: string): boolean {
  const result = redactPii(text, { returnDetails: true });
  return result.redactionCount > 0;
}

/**
 * Retourne les types de PII détectés dans un texte.
 */
export function detectPiiTypes(text: string): PiiType[] {
  const result = redactPii(text, { returnDetails: true });
  return result.detectedTypes;
}
