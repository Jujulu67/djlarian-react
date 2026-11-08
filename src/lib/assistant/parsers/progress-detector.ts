import { logger } from '@/lib/logger';
/**
 * Détecteur de progression depuis les requêtes utilisateur
 * Détecte les valeurs de progression (pourcentages) avec différentes formulations
 */

type ProgressRange = { minProgress?: number; maxProgress?: number };

// "inférieur à X%" (ou "< X%") → maximum
const INFERIEUR_PATTERNS = [
  /inf[ée]rieur[.\s]*à\s*(\d+)\s*%/i,
  /<\s*à\s*(\d+)\s*%/i,
  /<\s*(\d+)\s*%/i,
];

// "supérieur à X%" (ou "> X%") → minimum
const SUPERIEUR_PATTERNS = [
  /sup[ée]rieur[.\s]*à\s*(\d+)\s*%/i,
  />\s*à\s*(\d+)\s*%/i,
  />\s*(\d+)\s*%/i,
];

const PERCENTAGE_PATTERNS = [
  // "à X%", "fini à X%", "terminé à X%"
  /(?:à|fini|terminé|finis)\s*(\d+)\s*%/i,
  // "entre X et Y%", "de X à Y%"
  /(?:entre|de)\s*(\d+)\s*(?:et|à)\s*(\d+)\s*%/i,
  // "plus de X%", "au moins X%", "minimum X%"
  /(?:plus\s*de|au\s*moins|minimum|min)\s*(\d+)\s*%/i,
  // "moins de X%", "au plus X%", "maximum X%"
  /(?:moins\s*de|au\s*plus|maximum|max)\s*(\d+)\s*%/i,
  // "X%", "X pourcent"
  /(?<!\d)(\d+)\s*(?:%|pourcent)/i,
];

// Support des décimaux (0.7 → 70%, 0.5 → 50%)
const DECIMAL_PATTERNS = [
  // "à 0.7", "met à 0.5", "progression de 0.8"
  /(?:à|met(?:s|tre)?(?:\s*à)?|progression\s*(?:de|à)?)\s*(0[.,]\d+)/i,
  // Juste un décimal suivi d'optionnel %
  /(0[.,]\d+)\s*%?/i,
];

const TEXTUAL_PATTERNS: { pattern: RegExp; min?: number; max?: number }[] = [
  // "à mi-chemin", "à la moitié" → 50%
  { pattern: /(?:à\s+)?mi[- ]chemin|à\s+la\s+moitié|à\s+50/i, min: 50, max: 50 },
  // "presque fini", "quasi terminé", "quasiment fini" → 90%
  { pattern: /presque\s+(?:fini|terminé)|quasi(?:ment)?\s+(?:fini|terminé)/i, min: 90, max: 100 },
  // "à peine commencé", "juste démarré" → 5%
  { pattern: /à\s+peine\s+(?:commencé|démarré)|juste\s+(?:commencé|démarré)/i, min: 0, max: 10 },
  // "bien avancé", "très avancé" → 70-80%
  { pattern: /(?:bien|très)\s+avancé/i, min: 70, max: 90 },
  // "pas encore commencé", "pas commencé" → 0%
  { pattern: /pas\s+(?:encore\s+)?commencé|pas\s+(?:encore\s+)?démarré/i, min: 0, max: 0 },
];

// Borne simple (inférieur à / supérieur à) : la première regex qui matche gagne
function detectBound(
  lowerQuery: string,
  patterns: RegExp[],
  field: 'minProgress' | 'maxProgress',
  label: string
): ProgressRange | null {
  for (const pattern of patterns) {
    const match = pattern.exec(lowerQuery);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      const kind = field === 'maxProgress' ? 'max' : 'min';
      logger.warn(`[Assistant] Progression ${kind} détectée (${label}): ${value}%`);
      return { [field]: value };
    }
  }
  return null;
}

// Pourcentages : "entre X et Y", "plus de X", "moins de X", "à X" / "X%"
function detectPercentage(lowerQuery: string): ProgressRange | null {
  for (const pattern of PERCENTAGE_PATTERNS) {
    const match = pattern.exec(lowerQuery);
    if (match) {
      return percentageRangeFromMatch(lowerQuery, match);
    }
  }
  return null;
}

function percentageRangeFromMatch(lowerQuery: string, match: RegExpExecArray): ProgressRange {
  const result: ProgressRange = {};
  if (match[2]) {
    // Pattern "entre X et Y"
    result.minProgress = Number.parseInt(match[1], 10);
    result.maxProgress = Number.parseInt(match[2], 10);
    logger.warn(
      `[Assistant] Progression détectée: ${result.minProgress}% - ${result.maxProgress}%`
    );
  } else if (
    lowerQuery.includes('plus') ||
    lowerQuery.includes('au moins') ||
    lowerQuery.includes('minimum')
  ) {
    // "plus de X%"
    result.minProgress = Number.parseInt(match[1], 10);
    logger.warn(`[Assistant] Progression min détectée: ${result.minProgress}%`);
  } else if (
    lowerQuery.includes('moins') ||
    lowerQuery.includes('au plus') ||
    lowerQuery.includes('maximum')
  ) {
    // "moins de X%"
    result.maxProgress = Number.parseInt(match[1], 10);
    logger.warn(`[Assistant] Progression max détectée: ${result.maxProgress}%`);
  } else {
    // "à X%" ou "X%"
    const value = Number.parseInt(match[1], 10);
    // Si on dit "fini à 100%" ou "terminé à 100%", c'est minProgress = 100
    if (lowerQuery.includes('fini') || lowerQuery.includes('terminé')) {
      result.minProgress = value;
    } else {
      // Sinon, on considère que c'est une valeur exacte (min et max)
      result.minProgress = value;
      result.maxProgress = value;
    }
    logger.warn(`[Assistant] Progression détectée: ${value}%`);
  }
  return result;
}

// Décimaux entre 0 et 1 (0.7 → 70%)
function detectDecimal(lowerQuery: string): ProgressRange | null {
  for (const pattern of DECIMAL_PATTERNS) {
    const match = pattern.exec(lowerQuery);
    if (match?.[1]) {
      const decimalValue = Number.parseFloat(match[1].replace(',', '.'));
      if (decimalValue > 0 && decimalValue <= 1) {
        const percentValue = Math.round(decimalValue * 100);
        logger.warn(
          `[Assistant] Progression décimale détectée: ${decimalValue} → ${percentValue}%`
        );
        return { minProgress: percentValue, maxProgress: percentValue };
      }
    }
  }
  return null;
}

// Expressions textuelles de progression ("à mi-chemin", "presque fini", ...)
function detectTextual(lowerQuery: string): ProgressRange | null {
  for (const { pattern, min, max } of TEXTUAL_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      const result: ProgressRange = {};
      if (min !== undefined) result.minProgress = min;
      if (max !== undefined) result.maxProgress = max;
      logger.warn(`[Assistant] Progression textuelle détectée: ${min}% - ${max}%`);
      return result;
    }
  }
  return null;
}

/**
 * Détecte les valeurs de progression depuis la requête
 * Exemples: "à 80%", "fini à 100%", "entre 50 et 75%", "plus de 80%", "moins de 50%", "inférieur à 70%"
 */
export function detectProgressFromQuery(query: string): {
  minProgress?: number;
  maxProgress?: number;
} {
  const lowerQuery = query.toLowerCase();
  return (
    detectBound(lowerQuery, INFERIEUR_PATTERNS, 'maxProgress', 'inférieur à') ??
    detectBound(lowerQuery, SUPERIEUR_PATTERNS, 'minProgress', 'supérieur à') ??
    detectPercentage(lowerQuery) ??
    detectDecimal(lowerQuery) ??
    detectTextual(lowerQuery) ??
    {}
  );
}
