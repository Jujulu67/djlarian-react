/**
 * Extraction des données de metadata depuis les requêtes
 * Gère les collaborateurs, styles, labels (ciblé et final)
 */
import { UpdateData } from './types';
import { findStyleFromString } from '../../parsers/style-matcher';
import { logger } from '@/lib/logger';

/**
 * Extrait les modifications de metadata depuis une requête
 */
export function extractMetadataUpdate(
  query: string,
  cleanedQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData,
  availableStyles: string[]
): void {
  extractCollabUpdate(query, filters, updateData);
  extractStyleUpdate(cleanedQuery, filters, updateData, availableStyles);
  extractLabelUpdate(query, updateData);
  extractLabelFinalUpdate(query, updateData);
}

/** Mots qui ne peuvent pas être un nom de collaborateur (pattern « avec X à Y »). */
const COLLAB_PAIR_IGNORED_WORDS = [
  'projets',
  'projet',
  'les',
  'mes',
  'de',
  'en',
  'le',
  'la',
  'des',
  'avec',
];

/** Mots qui ne peuvent pas être un nom de collaborateur (patterns simples). */
const COLLAB_SIMPLE_IGNORED_WORDS = [
  'projets',
  'projet',
  'les',
  'mes',
  'de',
  'en',
  'le',
  'la',
  'avec',
];

/** Retire les espaces et le préfixe « avec » éventuel d'un nom de collaborateur. */
function stripLeadingAvec(value: string): string {
  const trimmed = value.trim();
  return trimmed.toLowerCase().startsWith('avec ') ? trimmed.substring(5).trim() : trimmed;
}

/** Pattern « collab avec X à Y » : filtre X, nouvelle valeur Y. */
function extractCollabPairUpdate(
  query: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): boolean {
  const collabPatterns = [
    /(?:en\s+)?(?:collab|collaborateur)\s+avec\s+([a-z0-9_\s]+?)\s+à\s+([a-z0-9_\s]+?)(?:\s|$)/i,
    /(?:collab|collaborateur)\s+avec\s+([a-z0-9_\s]+?)\s+à\s+([a-z0-9_\s]+?)(?:\s|$)/i,
    /en\s+collab\s+avec\s+([a-z0-9_\s]+?)\s+à\s+([a-z0-9_\s]+?)(?:\s|$)/i,
    /avec\s+(?:le\s+)?(?:collab|collaborateur)\s+([a-z0-9_\s]+?)\s+à\s+([a-z0-9_\s]+?)(?:\s|$)/i,
  ];

  for (const pattern of collabPatterns) {
    const match = pattern.exec(query);
    if (match?.[1] && match[2]) {
      const filterCollab = match[1].trim();
      const newCollab = stripLeadingAvec(match[2]);

      if (!COLLAB_PAIR_IGNORED_WORDS.includes(newCollab.toLowerCase()) && newCollab.length > 0) {
        filters.collab = filterCollab;
        updateData.newCollab = newCollab;
        logger.warn(
          '[Parse Query API] ✅ Pattern "collab avec X à Y" détecté:',
          `filtre=${filterCollab}, nouvelle valeur=${newCollab}`
        );
        return true;
      }
    }
  }
  return false;
}

/** Patterns simples : « passe les collabs à X », « en collaborateur X », etc. */
function extractSimpleCollabUpdate(query: string, updateData: UpdateData): boolean {
  const simplePatterns = [
    // "passe les collaborateurs/collabs à X", "met les collabs à X", "passe les collabs de ces tracks à X"
    /(?:passe|met|mets|change|modifie|cahnge|chnage|chang|pase|pass|modifi|mets?)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:collaborateurs?|collabs?)(?:\s+de\s+.+?)?\s+(?:à|a|par|pour|en|avec)\s+([a-z0-9_\s]+?)(?:\s|$)/i,
    // "collaborateurs/collabs à X" (direct)
    /(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:collaborateurs?|collabs?)\s+(?:à|a|par|pour|en|avec)\s+([a-z0-9_\s]+?)(?:\s|$)/i,
    /(?:en\s+)?mettant\s+(?:en\s+)?(?:collaborateur|collab)\s+([a-z0-9_\s]+)/i,
    /(?:en|avec)\s+(?:collaborateur|collab)\s+([a-z0-9_\s]+)/i,
    /(?:mets?|met|change|changer|modifie|modifier|passe|passer|cahnge|chnage|chang|pase|pass|modifi|mets?)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:projets?\s+)?(?:en|à|avec|par|pour)\s+(?:collaborateur|collab)\s+(?:avec\s+)?([a-z0-9_\s]+?)(?:\s|$)/i,
  ];

  for (const pattern of simplePatterns) {
    const match = pattern.exec(query);
    if (match?.[1]) {
      const collabName = stripLeadingAvec(match[1]);
      if (
        !COLLAB_SIMPLE_IGNORED_WORDS.includes(collabName.toLowerCase()) &&
        collabName.length > 0
      ) {
        updateData.newCollab = collabName;
        logger.warn('[Parse Query API] ✅ Nouveau collaborateur détecté:', collabName);
        return true;
      }
    }
  }
  return false;
}

/**
 * Extrait le nouveau collaborateur
 */
function extractCollabUpdate(
  query: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): void {
  if (extractCollabPairUpdate(query, filters, updateData)) return;
  extractSimpleCollabUpdate(query, updateData);
}

/** Mots de style qui sont en réalité des mots de progression ou des fragments de phrase. */
const STYLE_IGNORED_WORDS = new Set([
  'projets',
  'projet',
  'les',
  'mes',
  'de',
  'en',
  'le',
  'la',
  'des',
  'cours',
  'attente',
  'termine',
  'progression',
  'avancement',
  'progress',
  'pourcent',
  'pourcentage',
  'percent',
  'percentage',
]);

/** Patterns simples de changement de style. */
const NEW_STYLE_PATTERNS = [
  /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:les?\s+)?(?:projets?\s+)?(?:le\s+)?style\s+([a-z0-9_\s]+)(?:\s|$)/i,
  /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:les?\s+)?(?:projets?\s+)?(?:le\s+)?style\s+(?:à|en|pour|par)\s+([a-z0-9_\s]+)/i,
  /(?:en|à)\s+style\s+([a-z0-9_\s]+)/i,
  /style\s+(?:à|en|pour|par)\s+([a-z0-9_\s]+)/i,
  /(?:mets?|met|change|changer|modifie|modifier|passe|passer)\s+(?:les?\s+)?(?:projets?\s+)?en\s+([a-z0-9_\s]+)(?:\s|$)/i,
];

/** Vrai si le nom de style contient un mot de progression ou un pourcentage. */
function isProgressionStyleName(lowerStyleName: string): boolean {
  return (
    lowerStyleName.includes('progression') ||
    lowerStyleName.includes('avancement') ||
    lowerStyleName.includes('progress') ||
    lowerStyleName.includes('%') ||
    lowerStyleName.includes('pourcent')
  );
}

/**
 * Vrai si la requête parle de progression/avancement sans mention explicite de « style » :
 * les candidats de style sont alors ignorés.
 */
function isProgressionCommand(cleanedQuery: string): boolean {
  const queryLower = cleanedQuery.toLowerCase();
  if (queryLower.includes('style')) return false;
  return (
    queryLower.includes('progression') ||
    queryLower.includes('avancement') ||
    queryLower.includes('progress') ||
    queryLower.includes('pourcent')
  );
}

/** Vrai si la requête contient un mot de progression (« progress » hors « progressive »). */
function hasProgressionWords(queryLower: string): boolean {
  return (
    queryLower.includes('progression') ||
    queryLower.includes('avancement') ||
    (queryLower.includes('progress') && !queryLower.includes('progressive'))
  );
}

/** Style « Progressive » détecté à tort (via « prog » dans « progression »). */
function isFalseProgressiveStyle(
  matchedStyle: string | undefined,
  styleName: string,
  lowerStyleName: string,
  hasProgressionKeywords: boolean,
  hasExplicitStyleKeyword: boolean
): boolean {
  return (
    matchedStyle === 'Progressive' &&
    isFalseProgressiveMatch(
      styleName,
      lowerStyleName,
      hasProgressionKeywords,
      hasExplicitStyleKeyword
    )
  );
}

/** Faux positif « Progressive » (matché via « prog » dans « progression »). */
function isFalseProgressiveMatch(
  styleName: string,
  lowerStyleName: string,
  hasProgressionKeywords: boolean,
  hasExplicitStyleKeyword: boolean
): boolean {
  // Si la requête contient "progression" ou "avancement" sans "style", ignorer
  if (hasProgressionKeywords && !hasExplicitStyleKeyword) {
    logger.warn(
      '[Parse Query API] ⚠️ Style "Progressive" détecté mais ignoré (faux positif via "prog" dans "progression"):',
      styleName
    );
    return true;
  }

  // Si le styleName contient "prog" mais n'est pas exactement "progressive" ou "prog", ignorer
  if (lowerStyleName.includes('prog') && !/^(progressive|prog)$/.exec(lowerStyleName)) {
    logger.warn(
      '[Parse Query API] ⚠️ Style "Progressive" détecté mais ignoré (faux positif):',
      styleName
    );
    return true;
  }
  return false;
}

/** Pattern « de style X à Y » : filtre X, nouvelle valeur Y. */
function extractFilterStyleUpdate(
  cleanedQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData,
  availableStyles: string[]
): boolean {
  const filterToNewPattern = /(?:de|depuis)\s+style\s+([a-z0-9_\s]+)\s+à\s+([a-z0-9_\s]+)/i;
  const filterMatch = filterToNewPattern.exec(cleanedQuery);
  if (!filterMatch) return false;

  const filterStyle = filterMatch[1].trim();
  const newStyle = filterMatch[2].trim();
  filters.style = filterStyle;
  const styleMatch = findStyleFromString(newStyle, availableStyles);
  updateData.newStyle = styleMatch ? styleMatch.style : newStyle;
  logger.warn(
    '[Parse Query API] ✅ Pattern "de style X à Y" détecté:',
    `filtre=${filterStyle}, nouvelle valeur=${updateData.newStyle}`
  );
  return true;
}

/**
 * Extrait le nouveau style
 */
function extractStyleUpdate(
  cleanedQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData,
  availableStyles: string[]
): void {
  // Vérification préalable : si la requête contient "progression" ou "avancement" sans mention explicite de "style",
  // c'est probablement une commande de progression, pas de style
  const queryLower = cleanedQuery.toLowerCase();
  const hasProgressionKeywords = hasProgressionWords(queryLower);
  const hasExplicitStyleKeyword = queryLower.includes('style');

  // Si on a des mots de progression mais pas de mention explicite de "style", ignorer complètement l'extraction de style
  if (hasProgressionKeywords && !hasExplicitStyleKeyword) {
    logger.warn(
      '[Parse Query API] ⚠️ Extraction de style ignorée (requête contient progression/avancement sans "style"):',
      cleanedQuery
    );
    return;
  }

  if (extractFilterStyleUpdate(cleanedQuery, filters, updateData, availableStyles)) return;

  for (const pattern of NEW_STYLE_PATTERNS) {
    const match = pattern.exec(cleanedQuery);
    if (!match?.[1]) continue;

    const styleName = match[1].trim();
    const lowerStyleName = styleName.toLowerCase();

    // Vérification préalable : progression/avancement sans "style" dans la requête
    if (isProgressionCommand(cleanedQuery)) {
      logger.warn(
        '[Parse Query API] ⚠️ Style détecté mais ignoré (requête contient progression/avancement):',
        styleName
      );
      continue;
    }

    if (STYLE_IGNORED_WORDS.has(lowerStyleName) || isProgressionStyleName(lowerStyleName)) {
      continue;
    }

    const styleMatch = findStyleFromString(styleName, availableStyles);

    // Vérification finale : "Progressive" peut être un faux positif (via "prog" dans "progression")
    if (
      isFalseProgressiveStyle(
        styleMatch?.style,
        styleName,
        lowerStyleName,
        hasProgressionKeywords,
        hasExplicitStyleKeyword
      )
    ) {
      continue;
    }

    updateData.newStyle = styleMatch ? styleMatch.style : styleName;
    logger.warn('[Parse Query API] ✅ Nouveau style détecté:', updateData.newStyle);
    return;
  }
}

/**
 * Extrait le nouveau label ciblé
 */
function extractLabelUpdate(query: string, updateData: UpdateData): void {
  const patterns = [
    /(?:label|label\s+cibl[ée])\s+(?:à|en|pour)\s+([a-z0-9_\s]+)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+(?:à|en|pour)\s+([a-z0-9_\s]+)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+cibl[ée]\s+(?:à|en|pour)?\s*([a-z0-9_\s]+)/i,
  ];

  const ignoredWords = new Set([
    'projets',
    'projet',
    'les',
    'mes',
    'de',
    'en',
    'le',
    'la',
    'des',
    'ciblé',
    'ciblée',
  ]);

  for (const pattern of patterns) {
    const match = pattern.exec(query);
    if (match?.[1]) {
      const labelName = match[1].trim();
      if (!ignoredWords.has(labelName.toLowerCase())) {
        updateData.newLabel = labelName;
        logger.warn('[Parse Query API] ✅ Nouveau label détecté:', labelName);
        return;
      }
    }
  }
}

/**
 * Extrait le nouveau label final
 */
function extractLabelFinalUpdate(query: string, updateData: UpdateData): void {
  const patterns = [
    /(?:label\s+final|sign[ée])\s+(?:à|en|chez|pour)\s+([a-z0-9_\s]+)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+final\s+(?:à|en|pour)\s+([a-z0-9_\s]+)/i,
    /sign[ée]\s+chez\s+([a-z0-9_\s]+)/i,
  ];

  const ignoredWords = new Set([
    'projets',
    'projet',
    'les',
    'mes',
    'de',
    'en',
    'le',
    'la',
    'des',
    'final',
  ]);

  for (const pattern of patterns) {
    const match = pattern.exec(query);
    if (match?.[1]) {
      const labelFinalName = match[1].trim();
      if (!ignoredWords.has(labelFinalName.toLowerCase())) {
        updateData.newLabelFinal = labelFinalName;
        logger.warn('[Parse Query API] ✅ Nouveau label final détecté:', labelFinalName);
        return;
      }
    }
  }
}
