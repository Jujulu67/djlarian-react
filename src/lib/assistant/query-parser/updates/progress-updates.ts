/**
 * Extraction des données de progression depuis les requêtes
 */
import { UpdateData } from './types';
import { logger } from '@/lib/logger';

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
      logger.warn(
        '[Parse Query API] ✅ Pattern "de X% à Y" détecté:',
        `filtre=${filterValue}%, nouvelle valeur=${newValue}%`
      );
      return true;
    }
  }
  return false;
}

const EXPLICIT_NEW_PROGRESS_PATTERNS = [
  /(?:à|en)\s+(\d+)\s*%\s*$/i,
  // "passe leur avancement à X%", "met leur progression à X%"
  /(?:mets?|met|passe|passer|change|changer|modifie|modifier|pousse|augmente|diminue)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:avancement|progression)\s+(?:à|en)\s+(\d+)\s*%?/i,
  /(?:mets?|met|passe|passer|change|changer|modifie|modifier|pousse|augmente|diminue)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)\s*%?/i,
  /(?:mets?|met|passe|passer|change|changer|modifie|modifier|pousse|augmente|diminue)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:projets?\s+)?[^à]*\s+(?:à|en)\s+(\d+)\s*%?/i,
  /(?:passe|met|mets?|change|changer|modifie|modifier|pousse|augmente|diminue)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?projets?\s+(?:à|en)\s+(\d+)\s*%?/i,
  // "leur avancement à X%" (direct)
  /(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:avancement|progression)\s+(?:à|en)\s+(\d+)\s*%?/i,
];

const NUMBER_WITHOUT_PERCENT_PATTERNS = [
  /(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)(?:\s|$)/i,
  /(?:à|en)\s+(\d+)\s*$/i,
  /et\s+(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)/i,
];

const UPDATE_VERB_PATTERN =
  /(?:passe|met|mets?|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?|deadlines?)/i;
const NO_PROGRESS_PATTERN =
  /(?:passe|mets?|met|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:sans\s*avancement|sans\s*progression|pas\s*d['’]?avancement|no\s*progress|null)/i;

const isValidProgress = (value: number) => !isNaN(value) && value >= 0 && value <= 100;

const isUsedAsFilter = (filters: Record<string, unknown>, value: number) =>
  filters.minProgress === value || filters.maxProgress === value;

/** Nombre sans % (« passe à 50 ») qui n'est pas déjà un filtre. */
function findNumberProgress(
  cleanedQuery: string,
  filters: Record<string, unknown>
): number | undefined {
  for (const pattern of NUMBER_WITHOUT_PERCENT_PATTERNS) {
    const value = parseInt(cleanedQuery.match(pattern)?.[1] ?? '', 10);
    if (isValidProgress(value) && !isUsedAsFilter(filters, value)) return value;
  }
  return undefined;
}

/** Dernier pourcentage de la requête, s'il termine la phrase et n'est pas déjà un filtre. */
function findTrailingPercent(
  cleanedQuery: string,
  filters: Record<string, unknown>
): number | undefined {
  const allPercentMatches = Array.from(cleanedQuery.matchAll(/(?<!\d)(\d+)\s*%/gi));
  const lastPercentMatch = allPercentMatches.at(-1);
  if (!lastPercentMatch) return undefined;
  const lastPercentValue = parseInt(lastPercentMatch[1], 10);
  const lastPercentIndex = lastPercentMatch.index || 0;
  const textAfterLastPercent = cleanedQuery
    .substring(lastPercentIndex + lastPercentMatch[0].length)
    .toLowerCase();

  const isFollowedByProgressKeyword = /d['’]?avancement|de\s+progress|de\s+progression/i.test(
    textAfterLastPercent
  );
  const isFollowedByDate =
    /\b(?:au|à\s+le|pour|pour\s+le)\s+(?:le\s+)?(?:mois\s+prochain|semaine\s+pro|semaine\s+prochaine|next\s+month|next\s+week|demain|tomorrow|aujourd['’]hui|today)/i.test(
      textAfterLastPercent
    );

  const isTrailing =
    !isFollowedByProgressKeyword &&
    (!textAfterLastPercent.trim() || textAfterLastPercent.trim().length < 10 || isFollowedByDate);
  return isTrailing &&
    isValidProgress(lastPercentValue) &&
    !isUsedAsFilter(filters, lastPercentValue)
    ? lastPercentValue
    : undefined;
}

/** Motifs explicites : un filtre peut aussi être la cible si la requête a un verbe de mise à jour. */
function findExplicitProgress(
  cleanedQuery: string,
  filters: Record<string, unknown>
): number | undefined {
  const hasUpdateVerb = UPDATE_VERB_PATTERN.test(cleanedQuery);
  for (const pattern of EXPLICIT_NEW_PROGRESS_PATTERNS) {
    const value = parseInt(cleanedQuery.match(pattern)?.[1] ?? '', 10);
    if (isValidProgress(value) && (!isUsedAsFilter(filters, value) || hasUpdateVerb)) return value;
  }
  return undefined;
}

export function extractNewProgress(
  cleanedQuery: string,
  lowerQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): void {
  // Si déjà détecté via pattern "de X% à Y", skip
  if (updateData.newProgress !== undefined) return;

  // Priorité aux nombres sans %, motifs explicites en dernier recours
  const progress =
    findNumberProgress(cleanedQuery, filters) ??
    findTrailingPercent(cleanedQuery, filters) ??
    findExplicitProgress(cleanedQuery, filters);

  if (progress !== undefined) {
    updateData.newProgress = progress;
  } else if (NO_PROGRESS_PATTERN.test(lowerQuery)) {
    // « sans avancement » vaut 0 %
    updateData.newProgress = 0;
  }
}
