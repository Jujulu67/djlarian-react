/**
 * Détecteur de progression depuis les requêtes utilisateur
 * Détecte les valeurs de progression (pourcentages) avec différentes formulations
 */

/**
 * Détecte les valeurs de progression depuis la requête
 * Exemples: "à 80%", "fini à 100%", "entre 50 et 75%", "plus de 80%", "moins de 50%", "inférieur à 70%"
 */
export function detectProgressFromQuery(query: string): {
  minProgress?: number;
  maxProgress?: number;
} {
  const lowerQuery = query.toLowerCase();
  const result: { minProgress?: number; maxProgress?: number } = {};

  // D'abord, détecter "inférieur à X%", "inférieur.à X%" (avec point), ou "< à X%"
  const inferieurPatterns = [
    /inf[ée]rieur[.\s]*à\s*(\d+)\s*%/i,
    /<\s*à\s*(\d+)\s*%/i,
    /<\s*(\d+)\s*%/i,
  ];

  for (const pattern of inferieurPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      result.maxProgress = parseInt(match[1], 10);
      console.warn(`[Assistant] Progression max détectée (inférieur à): ${result.maxProgress}%`);
      return result;
    }
  }

  // Détecter "supérieur à X%", "supérieur.à X%" (avec point), ou "> à X%"
  const superieurPatterns = [
    /sup[ée]rieur[.\s]*à\s*(\d+)\s*%/i,
    />\s*à\s*(\d+)\s*%/i,
    />\s*(\d+)\s*%/i,
  ];

  for (const pattern of superieurPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      result.minProgress = parseInt(match[1], 10);
      console.warn(`[Assistant] Progression min détectée (supérieur à): ${result.minProgress}%`);
      return result;
    }
  }

  // Patterns pour détecter les pourcentages
  const percentagePatterns = [
    // "à X%", "fini à X%", "terminé à X%"
    /(?:à|fini|terminé|finis)\s*(\d+)\s*%/i,
    // "entre X et Y%", "de X à Y%"
    /(?:entre|de)\s*(\d+)\s*(?:et|à)\s*(\d+)\s*%/i,
    // "plus de X%", "au moins X%", "minimum X%"
    /(?:plus\s*de|au\s*moins|minimum|min)\s*(\d+)\s*%/i,
    // "moins de X%", "au plus X%", "maximum X%"
    /(?:moins\s*de|au\s*plus|maximum|max)\s*(\d+)\s*%/i,
    // "X%", "X pourcent"
    /(\d+)\s*(?:%|pourcent)/i,
  ];

  for (const pattern of percentagePatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      if (match[2]) {
        // Pattern "entre X et Y"
        result.minProgress = parseInt(match[1], 10);
        result.maxProgress = parseInt(match[2], 10);
        console.warn(
          `[Assistant] Progression détectée: ${result.minProgress}% - ${result.maxProgress}%`
        );
        return result;
      } else if (
        lowerQuery.includes('plus') ||
        lowerQuery.includes('au moins') ||
        lowerQuery.includes('minimum')
      ) {
        // "plus de X%"
        result.minProgress = parseInt(match[1], 10);
        console.warn(`[Assistant] Progression min détectée: ${result.minProgress}%`);
        return result;
      } else if (
        lowerQuery.includes('moins') ||
        lowerQuery.includes('au plus') ||
        lowerQuery.includes('maximum')
      ) {
        // "moins de X%"
        result.maxProgress = parseInt(match[1], 10);
        console.warn(`[Assistant] Progression max détectée: ${result.maxProgress}%`);
        return result;
      } else {
        // "à X%" ou "X%"
        const value = parseInt(match[1], 10);
        // Si on dit "fini à 100%" ou "terminé à 100%", c'est minProgress = 100
        if (lowerQuery.includes('fini') || lowerQuery.includes('terminé')) {
          result.minProgress = value;
        } else {
          // Sinon, on considère que c'est une valeur exacte (min et max)
          result.minProgress = value;
          result.maxProgress = value;
        }
        console.warn(`[Assistant] Progression détectée: ${value}%`);
        return result;
      }
    }
  }

  // Support des décimaux (0.7 → 70%, 0.5 → 50%)
  const decimalPatterns = [
    // "à 0.7", "met à 0.5", "progression de 0.8"
    /(?:à|met(?:s|tre)?(?:\s*à)?|progression\s*(?:de|à)?)\s*(0[.,]\d+)/i,
    // Juste un décimal suivi d'optionnel %
    /(0[.,]\d+)\s*%?/i,
  ];

  for (const pattern of decimalPatterns) {
    const match = lowerQuery.match(pattern);
    if (match && match[1]) {
      const decimalValue = parseFloat(match[1].replace(',', '.'));
      if (decimalValue > 0 && decimalValue <= 1) {
        const percentValue = Math.round(decimalValue * 100);
        result.minProgress = percentValue;
        result.maxProgress = percentValue;
        console.warn(
          `[Assistant] Progression décimale détectée: ${decimalValue} → ${percentValue}%`
        );
        return result;
      }
    }
  }

  // Expressions textuelles de progression
  const textualPatterns: { pattern: RegExp; min?: number; max?: number }[] = [
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

  for (const { pattern, min, max } of textualPatterns) {
    if (pattern.test(lowerQuery)) {
      if (min !== undefined) result.minProgress = min;
      if (max !== undefined) result.maxProgress = max;
      console.warn(`[Assistant] Progression textuelle détectée: ${min}% - ${max}%`);
      return result;
    }
  }

  return result;
}
