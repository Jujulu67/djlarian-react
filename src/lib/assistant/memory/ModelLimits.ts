import { logger } from '@/lib/logger';
/**
 * ModelLimits.ts - Configuration des limites officielles par modèle Groq
 *
 * O6: Limites modèle officielles (source: GroqCloud documentation)
 *
 * MODÈLES SUPPORTÉS:
 * - openai/gpt-oss-20b: context 131072, max output 65536
 * - openai/gpt-oss-120b: context 131072, max output 65536
 *
 * RÈGLES:
 * - max_completion_tokens ne doit JAMAIS dépasser ModelMaxOutputTokens[modelId]
 * - reserveForResponse doit être borné intelligemment (min/max) selon le modèle
 */

/** Modèles Groq de l'assistant : rapide par défaut, plus capable pour les requêtes complexes. */
export const GROQ_FAST_MODEL = 'openai/gpt-oss-20b';
export const GROQ_COMPLEX_MODEL = 'openai/gpt-oss-120b';

/**
 * Limites de contexte par modèle (tokens d'entrée maximum)
 * Source: https://console.groq.com/docs/models
 */
export const ModelContextTokens: Record<string, number> = {
  // openai/gpt-oss-20b: 131,072 tokens de contexte
  'openai/gpt-oss-20b': 131072,
  // openai/gpt-oss-120b: 131,072 tokens de contexte
  'openai/gpt-oss-120b': 131072,
};

/**
 * Limites de tokens de sortie maximum par modèle
 * ⚠️ CRITIQUE: Ces valeurs sont les maximums ABSOLUS de l'API
 *
 * Source: https://console.groq.com/docs/models
 * - openai/gpt-oss-20b: max output 65536
 * - openai/gpt-oss-120b: max output 65536
 */
export const ModelMaxOutputTokens: Record<string, number> = {
  'openai/gpt-oss-20b': 65536,
  'openai/gpt-oss-120b': 65536,
};

/**
 * Configuration par défaut pour les modèles inconnus
 */
export const DEFAULT_MODEL_LIMITS = {
  contextTokens: 8192, // Conservateur pour modèle inconnu
  maxOutputTokens: 4096, // Conservateur pour modèle inconnu
};

/**
 * Configuration de la réserve pour réponse par modèle
 * Bornes min/max pour reserveForResponse
 */
interface ResponseReserveConfig {
  min: number;
  max: number;
  default: number;
}

const ModelResponseReserve: Record<string, ResponseReserveConfig> = {
  'openai/gpt-oss-20b': {
    min: 256, // Réponse courte minimum
    max: 8192, // Réponse longue maximum (bien en dessous du max output)
    default: 1024, // Valeur par défaut
  },
  'openai/gpt-oss-120b': {
    min: 256,
    max: 4096,
    default: 1024,
  },
};

const DEFAULT_RESPONSE_RESERVE: ResponseReserveConfig = {
  min: 256,
  max: 2048,
  default: 1024,
};

/**
 * Récupère les limites de contexte pour un modèle
 * @param modelId Identifiant du modèle
 * @returns Nombre de tokens de contexte maximum
 */
export function getModelContextLimit(modelId: string): number {
  return ModelContextTokens[modelId] ?? DEFAULT_MODEL_LIMITS.contextTokens;
}

/**
 * Récupère la limite de tokens de sortie pour un modèle
 * @param modelId Identifiant du modèle
 * @returns Nombre de tokens de sortie maximum
 */
export function getModelMaxOutput(modelId: string): number {
  return ModelMaxOutputTokens[modelId] ?? DEFAULT_MODEL_LIMITS.maxOutputTokens;
}

/**
 * O6: Cap max_completion_tokens selon les limites du modèle
 *
 * @param modelId Identifiant du modèle
 * @param requestedTokens Tokens demandés par l'utilisateur/config
 * @returns Tokens cappés aux limites du modèle
 */
export function capMaxCompletionTokens(modelId: string, requestedTokens: number): number {
  const maxAllowed = getModelMaxOutput(modelId);
  const capped = Math.min(requestedTokens, maxAllowed);

  // Debug log si cap appliqué
  if (capped < requestedTokens && process.env.ASSISTANT_DEBUG === 'true') {
    logger.warn(
      `[ModelLimits] ⚠️ max_completion_tokens capped: ${requestedTokens} → ${capped} (model: ${modelId}, max: ${maxAllowed})`
    );
  }

  return capped;
}

/**
 * Calcule une réserve pour réponse bornée selon le modèle
 *
 * @param modelId Identifiant du modèle
 * @param requestedReserve Réserve demandée
 * @returns Réserve bornée aux limites du modèle
 */
export function getBoundedResponseReserve(modelId: string, requestedReserve: number): number {
  const config = ModelResponseReserve[modelId] ?? DEFAULT_RESPONSE_RESERVE;
  return Math.max(config.min, Math.min(requestedReserve, config.max));
}

/**
 * Valide que les paramètres de payload respectent les limites modèle
 *
 * @param modelId Identifiant du modèle
 * @param maxCompletionTokens Tokens de completion demandés
 * @returns Objet de validation avec warnings
 */
export function validateModelLimits(
  modelId: string,
  maxCompletionTokens: number
): { valid: boolean; warnings: string[]; cappedValue: number } {
  const warnings: string[] = [];
  const maxOutput = getModelMaxOutput(modelId);

  let cappedValue = maxCompletionTokens;

  if (maxCompletionTokens > maxOutput) {
    warnings.push(
      `max_completion_tokens (${maxCompletionTokens}) exceeds model limit (${maxOutput}) for ${modelId}`
    );
    cappedValue = maxOutput;
  }

  if (!(modelId in ModelMaxOutputTokens)) {
    warnings.push(`Unknown model "${modelId}", using default limits`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
    cappedValue,
  };
}
