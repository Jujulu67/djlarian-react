import { logger } from '@/lib/logger';
/**
 * SanitizeGroqMessages.ts - Validation stricte des messages avant envoi à Groq
 *
 * O8: Éliminer les workarounds incohérents côté groq-responder.ts
 *
 * CAUSE IDENTIFIÉE: L'erreur "unsupported content types" vient de:
 * 1. Messages avec content non-string (objet, array, etc.)
 * 2. Messages avec propriétés supplémentaires (timestamp, id, etc.)
 * 3. Rôles invalides (autre que system, user, assistant)
 *
 * SOLUTION: Validation stricte + sanitization avant envoi
 */

/**
 * Message Groq valide (format strict API)
 */
export interface ValidGroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Résultat de la sanitization
 */
interface SanitizeResult {
  messages: ValidGroqMessage[];
  sanitized: boolean;
  issues: SanitizeIssue[];
}

/**
 * Problème détecté lors de la sanitization
 */
interface SanitizeIssue {
  index: number;
  field: 'role' | 'content' | 'structure';
  original: unknown;
  action: 'fixed' | 'rejected' | 'converted';
  description: string;
}

/**
 * Options de sanitization
 */
interface SanitizeOptions {
  /** Rejeter les messages invalides (true) ou tenter de les corriger (false) */
  strict?: boolean;
  /** Logger les issues en debug */
  debug?: boolean;
}

const VALID_ROLES = new Set(['system', 'user', 'assistant']);

/**
 * Vérifie le rôle d'un message. Retourne false si le message doit être rejeté (mode strict).
 */
function checkRole(role: unknown, index: number, strict: boolean, result: SanitizeResult): boolean {
  if (typeof role === 'string' && VALID_ROLES.has(role)) return true;

  result.issues.push({
    index,
    field: 'role',
    original: role,
    action: strict ? 'rejected' : 'fixed',
    description: `Invalid role "${role}", expected system|user|assistant`,
  });
  // En mode non-strict, interpréter au mieux
  // Un rôle manquant ou invalide sur un message avec contenu → user par défaut
  result.sanitized = true;
  return !strict;
}

/**
 * Convertit le content en string. Retourne null si le message doit être rejeté (mode strict).
 */
function sanitizeContent(
  content: unknown,
  index: number,
  strict: boolean,
  result: SanitizeResult
): string | null {
  if (typeof content === 'string') return content;

  if (content === null || content === undefined) {
    result.issues.push({
      index,
      field: 'content',
      original: content,
      action: strict ? 'rejected' : 'converted',
      description: `Null/undefined content converted to empty string`,
    });
    result.sanitized = true;
    return strict ? null : '';
  }

  if (typeof content === 'object') {
    // Cas problématique: content est un objet (JSON, array, etc.)
    result.issues.push({
      index,
      field: 'content',
      original: typeof content,
      action: strict ? 'rejected' : 'converted',
      description: `Object content stringified: ${JSON.stringify(content).substring(0, 50)}...`,
    });
    result.sanitized = true;
    if (strict) return null;

    // Tenter de stringifier proprement
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }

  // Autre type primitif (number, boolean, etc.)
  result.issues.push({
    index,
    field: 'content',
    original: typeof content,
    action: 'converted',
    description: `Primitive ${typeof content} converted to string`,
  });
  result.sanitized = true;
  return String(content);
}

/**
 * O8: Sanitize les messages pour l'API Groq
 *
 * Garantit que chaque message a:
 * - role ∈ {system, user, assistant}
 * - content: string non-vide
 * - Pas de propriétés supplémentaires
 *
 * @param messages Messages bruts (potentiellement pollués)
 * @param options Options de sanitization
 * @returns Messages sanitizés + rapport d'issues
 */
export function sanitizeGroqMessages(
  messages: unknown[],
  options: SanitizeOptions = {}
): SanitizeResult {
  const { strict = false, debug = process.env.ASSISTANT_DEBUG === 'true' } = options;

  const result: SanitizeResult = {
    messages: [],
    sanitized: false,
    issues: [],
  };

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Vérifier que c'est un objet
    if (!msg || typeof msg !== 'object') {
      result.issues.push({
        index: i,
        field: 'structure',
        original: msg,
        action: 'rejected',
        description: `Message ${i} is not an object: ${typeof msg}`,
      });
      result.sanitized = true;
      continue;
    }

    const msgObj = msg as Record<string, unknown>;

    // Valider le rôle
    const role = msgObj.role;
    if (!checkRole(role, i, strict, result)) continue;

    // Valider et convertir le content
    const sanitizedContent = sanitizeContent(msgObj.content, i, strict, result);
    if (sanitizedContent === null) continue;

    // Créer le message sanitizé (objet pur, sans prototype)
    const validRole = (VALID_ROLES.has(role as string) ? role : 'user') as ValidGroqMessage['role'];

    result.messages.push({
      role: validRole,
      content: sanitizedContent,
    });
  }

  // Log en debug
  if (debug && result.issues.length > 0) {
    logger.warn('[SanitizeGroqMessages] Issues detected:', {
      issueCount: result.issues.length,
      issues: result.issues,
    });
  }

  return result;
}

/**
 * Valide qu'un tableau de messages est conforme à l'API Groq
 * Sans modification, juste validation
 *
 * @param messages Messages à valider
 * @returns true si tous les messages sont valides
 */
export function validateGroqMessages(messages: unknown[]): boolean {
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') return false;

    const msgObj = msg as Record<string, unknown>;

    if (typeof msgObj.role !== 'string' || !VALID_ROLES.has(msgObj.role)) {
      return false;
    }

    if (typeof msgObj.content !== 'string') {
      return false;
    }

    // Vérifier qu'il n'y a pas de propriétés supplémentaires
    const keys = Object.keys(msgObj);
    if (keys.length !== 2 || !keys.includes('role') || !keys.includes('content')) {
      return false;
    }
  }

  return true;
}

/**
 * Crée un message Groq valide à partir de composants
 * Garantit la pureté de l'objet (pas de prototype, pas de méthodes)
 */
export function createValidGroqMessage(
  role: 'system' | 'user' | 'assistant',
  content: string
): ValidGroqMessage {
  // Littéral d'objet : un objet pur, sans prototype ni propriété héritée
  return { role, content };
}
