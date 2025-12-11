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
      console.log(`[Assistant] Progression max détectée (inférieur à): ${result.maxProgress}%`);
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
      console.log(`[Assistant] Progression min détectée (supérieur à): ${result.minProgress}%`);
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
        console.log(
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
        console.log(`[Assistant] Progression min détectée: ${result.minProgress}%`);
        return result;
      } else if (
        lowerQuery.includes('moins') ||
        lowerQuery.includes('au plus') ||
        lowerQuery.includes('maximum')
      ) {
        // "moins de X%"
        result.maxProgress = parseInt(match[1], 10);
        console.log(`[Assistant] Progression max détectée: ${result.maxProgress}%`);
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
        console.log(`[Assistant] Progression détectée: ${value}%`);
        return result;
      }
    }
  }

  return result;
}
