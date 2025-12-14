/**
 * Extraction des données de progression depuis les requêtes
 */
import { UpdateData, debugLog } from './types';

/**
 * Copie les filtres de progression depuis filters vers updateData
 */
export function copyProgressFilters(
  filters: Record<string, unknown>,
  updateData: UpdateData
): void {
  if (
    filters.minProgress !== undefined &&
    filters.minProgress !== null &&
    typeof filters.minProgress === 'number'
  ) {
    updateData.minProgress = filters.minProgress;
  }
  if (filters.maxProgress !== undefined && filters.maxProgress !== null) {
    updateData.maxProgress = filters.maxProgress as number;
  }
  if (filters.noProgress) {
    updateData.noProgress = true;
  }
}

/**
 * Détecte le pattern "de X% à Y" pour les changements de progression
 */
export function extractDeXaYProgress(
  cleanedQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): boolean {
  const deXaYPattern = /(?:de|depuis)\s+(\d+)\s*%\s+à\s+(\d+)(?:\s*%|$)/i;
  const deXaYMatch = cleanedQuery.match(deXaYPattern);

  if (deXaYMatch) {
    const filterValue = parseInt(deXaYMatch[1], 10);
    const newValue = parseInt(deXaYMatch[2], 10);
    if (
      !isNaN(filterValue) &&
      filterValue >= 0 &&
      filterValue <= 100 &&
      !isNaN(newValue) &&
      newValue >= 0 &&
      newValue <= 100
    ) {
      filters.minProgress = filterValue;
      filters.maxProgress = filterValue;
      updateData.newProgress = newValue;
      console.warn(
        '[Parse Query API] ✅ Pattern "de X% à Y" détecté:',
        `filtre=${filterValue}%, nouvelle valeur=${newValue}%`
      );
      return true;
    }
  }
  return false;
}

/**
 * Extrait la nouvelle progression depuis une requête
 */
export function extractNewProgress(
  cleanedQuery: string,
  lowerQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): void {
  // Si déjà détecté via pattern "de X% à Y", skip
  if (updateData.newProgress !== undefined) {
    return;
  }

  // Patterns explicites pour nouvelle valeur
  const explicitNewProgressPatterns = [
    /(?:à|en)\s+(\d+)\s*%\s*$/i,
    // "passe leur avancement à X%", "met leur progression à X%"
    /(?:mets?|met|passe|passer|change|changer|modifie|modifier|pousse|augmente|diminue)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:avancement|progression)\s+(?:à|en)\s+(\d+)\s*%?/i,
    /(?:mets?|met|passe|passer|change|changer|modifie|modifier|pousse|augmente|diminue)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)\s*%?/i,
    /(?:mets?|met|passe|passer|change|changer|modifie|modifier|pousse|augmente|diminue)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:projets?\s+)?[^à]*\s+(?:à|en)\s+(\d+)\s*%?/i,
    /(?:passe|met|mets?|change|changer|modifie|modifier|pousse|augmente|diminue)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?projets?\s+(?:à|en)\s+(\d+)\s*%?/i,
    // "leur avancement à X%" (direct)
    /(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:avancement|progression)\s+(?:à|en)\s+(\d+)\s*%?/i,
  ];

  const numberWithoutPercentPatterns = [
    /(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)(?:\s|$)/i,
    /(?:à|en)\s+(\d+)\s*$/i,
    /et\s+(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)/i,
  ];

  // Chercher nombres sans %
  let newProgressFromNumber: number | undefined;
  for (const pattern of numberWithoutPercentPatterns) {
    const match = cleanedQuery.match(pattern);
    if (match && match[1]) {
      const value = parseInt(match[1], 10);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        const isUsedAsFilter =
          (filters.minProgress !== undefined && filters.minProgress === value) ||
          (filters.maxProgress !== undefined && filters.maxProgress === value);
        if (!isUsedAsFilter) {
          newProgressFromNumber = value;
          debugLog('[Parse Query API] ✅ Nouvelle progression détectée (nombre sans %):', value);
          break;
        }
      }
    }
  }

  // Chercher pourcentages
  const allPercentMatches = Array.from(cleanedQuery.matchAll(/(\d+)\s*%/gi));
  if (allPercentMatches.length > 0) {
    const lastPercentMatch = allPercentMatches[allPercentMatches.length - 1];
    const lastPercentValue = parseInt(lastPercentMatch[1], 10);
    const lastPercentIndex = lastPercentMatch.index || 0;
    const textAfterLastPercent = cleanedQuery
      .substring(lastPercentIndex + lastPercentMatch[0].length)
      .toLowerCase();

    const isFollowedByProgressKeyword = /d['']?avancement|de\s+progress|de\s+progression/i.test(
      textAfterLastPercent
    );
    const isFollowedByDate =
      /\b(?:au|à\s+le|pour|pour\s+le)\s+(?:le\s+)?(?:mois\s+prochain|semaine\s+pro|semaine\s+prochaine|next\s+month|next\s+week|demain|tomorrow|aujourd['']hui|today)/i.test(
        textAfterLastPercent
      );

    if (
      !isFollowedByProgressKeyword &&
      (!textAfterLastPercent.trim() || textAfterLastPercent.trim().length < 10 || isFollowedByDate)
    ) {
      const isUsedAsFilter =
        (filters.minProgress !== undefined && filters.minProgress === lastPercentValue) ||
        (filters.maxProgress !== undefined && filters.maxProgress === lastPercentValue);

      if (
        !isUsedAsFilter &&
        !isNaN(lastPercentValue) &&
        lastPercentValue >= 0 &&
        lastPercentValue <= 100
      ) {
        if (newProgressFromNumber === undefined) {
          updateData.newProgress = lastPercentValue;
        }
      }
    }
  }

  // Priorité aux nombres sans %
  if (newProgressFromNumber !== undefined) {
    updateData.newProgress = newProgressFromNumber;
  }

  // Patterns explicites en dernier recours
  if (updateData.newProgress === undefined) {
    for (const pattern of explicitNewProgressPatterns) {
      const match = cleanedQuery.match(pattern);
      if (match && match[1]) {
        const progressValue = parseInt(match[1], 10);
        if (!isNaN(progressValue) && progressValue >= 0 && progressValue <= 100) {
          const isUsedAsFilter =
            (filters.minProgress !== undefined && filters.minProgress === progressValue) ||
            (filters.maxProgress !== undefined && filters.maxProgress === progressValue);
          const hasUpdateVerb =
            /(?:passe|met|mets?|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?|deadlines?)/i.test(
              cleanedQuery
            );

          if (!isUsedAsFilter || (isUsedAsFilter && hasUpdateVerb)) {
            updateData.newProgress = progressValue;
            break;
          }
        }
      }
    }
  }

  // Détecter "sans avancement" comme 0%
  if (
    updateData.newProgress === undefined &&
    /(?:passe|mets?|met|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:sans\s*avancement|sans\s*progression|pas\s*d['']?avancement|no\s*progress|null)/i.test(
      lowerQuery
    )
  ) {
    updateData.newProgress = 0;
  }
}
