/**
 * Extraction des données de metadata depuis les requêtes
 * Gère les collaborateurs, styles, labels (ciblé et final)
 */
import { UpdateData } from './types';
import { findStyleFromString } from '../../parsers/style-matcher';

/**
 * Extrait les modifications de metadata depuis une requête
 */
export function extractMetadataUpdate(
  query: string,
  cleanedQuery: string,
  filters: Record<string, any>,
  updateData: UpdateData,
  availableStyles: string[]
): void {
  extractCollabUpdate(query, filters, updateData);
  extractStyleUpdate(cleanedQuery, filters, updateData, availableStyles);
  extractLabelUpdate(query, updateData);
  extractLabelFinalUpdate(query, updateData);
}

/**
 * Extrait le nouveau collaborateur
 */
function extractCollabUpdate(
  query: string,
  filters: Record<string, any>,
  updateData: UpdateData
): void {
  // Pattern "collab avec X à Y" (filtre X, nouvelle valeur Y)
  const collabPatterns = [
    /(?:en\s+)?(?:collab|collaborateur)\s+avec\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
    /(?:collab|collaborateur)\s+avec\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
    /en\s+collab\s+avec\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
    /avec\s+(?:le\s+)?(?:collab|collaborateur)\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
  ];

  for (const pattern of collabPatterns) {
    const match = query.match(pattern);
    if (match && match[1] && match[2]) {
      const filterCollab = match[1].trim();
      let newCollab = match[2].trim();

      const ignoredWords = [
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
      if (newCollab.toLowerCase().startsWith('avec ')) {
        newCollab = newCollab.substring(5).trim();
      }
      if (!ignoredWords.includes(newCollab.toLowerCase()) && newCollab.length > 0) {
        filters.collab = filterCollab;
        updateData.newCollab = newCollab;
        console.log(
          '[Parse Query API] ✅ Pattern "collab avec X à Y" détecté:',
          `filtre=${filterCollab}, nouvelle valeur=${newCollab}`
        );
        return;
      }
    }
  }

  // Patterns simples "en collaborateur X"
  const simplePatterns = [
    // "passe les collaborateurs/collabs à X", "met les collabs à X", "passe les collabs de ces tracks à X"
    /(?:passe|met|mets|change|modifie|cahnge|chnage|chang|pase|pass|modifi|mets?)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:collaborateurs?|collabs?)(?:\s+de\s+.+?)?\s+(?:à|a|par|pour|en|avec)\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
    // "collaborateurs/collabs à X" (direct)
    /(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:collaborateurs?|collabs?)\s+(?:à|a|par|pour|en|avec)\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
    /(?:en\s+)?mettant\s+(?:en\s+)?(?:collaborateur|collab)\s+([A-Za-z0-9_\s]+)/i,
    /(?:en|avec)\s+(?:collaborateur|collab)\s+([A-Za-z0-9_\s]+)/i,
    /(?:mets?|met|change|changer|modifie|modifier|passe|passer|cahnge|chnage|chang|pase|pass|modifi|mets?)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:projets?\s+)?(?:en|à|avec|par|pour)\s+(?:collaborateur|collab)\s+(?:avec\s+)?([A-Za-z0-9_\s]+?)(?:\s|$)/i,
  ];

  for (const pattern of simplePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      let collabName = match[1].trim();
      const ignoredWords = ['projets', 'projet', 'les', 'mes', 'de', 'en', 'le', 'la', 'avec'];
      if (collabName.toLowerCase().startsWith('avec ')) {
        collabName = collabName.substring(5).trim();
      }
      if (!ignoredWords.includes(collabName.toLowerCase()) && collabName.length > 0) {
        updateData.newCollab = collabName;
        console.log('[Parse Query API] ✅ Nouveau collaborateur détecté:', collabName);
        return;
      }
    }
  }
}

/**
 * Extrait le nouveau style
 */
function extractStyleUpdate(
  cleanedQuery: string,
  filters: Record<string, any>,
  updateData: UpdateData,
  availableStyles: string[]
): void {
  // Pattern "de style X à Y"
  const filterToNewPattern = /(?:de|depuis)\s+style\s+([A-Za-z0-9_\s]+)\s+à\s+([A-Za-z0-9_\s]+)/i;
  const filterMatch = cleanedQuery.match(filterToNewPattern);

  if (filterMatch) {
    const filterStyle = filterMatch[1].trim();
    const newStyle = filterMatch[2].trim();
    filters.style = filterStyle;
    const styleMatch = findStyleFromString(newStyle, availableStyles);
    updateData.newStyle = styleMatch ? styleMatch.style : newStyle;
    console.log(
      '[Parse Query API] ✅ Pattern "de style X à Y" détecté:',
      `filtre=${filterStyle}, nouvelle valeur=${updateData.newStyle}`
    );
    return;
  }

  // Patterns simples
  const newStylePatterns = [
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:les?\s+)?(?:projets?\s+)?(?:le\s+)?style\s+([A-Za-z0-9_\s]+)(?:\s|$)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:les?\s+)?(?:projets?\s+)?(?:le\s+)?style\s+(?:à|en|pour|par)\s+([A-Za-z0-9_\s]+)/i,
    /(?:en|à)\s+style\s+([A-Za-z0-9_\s]+)/i,
    /style\s+(?:à|en|pour|par)\s+([A-Za-z0-9_\s]+)/i,
    /(?:mets?|met|change|changer|modifie|modifier|passe|passer)\s+(?:les?\s+)?(?:projets?\s+)?en\s+([A-Za-z0-9_\s]+)(?:\s|$)/i,
  ];

  const ignoredWords = [
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
  ];

  for (const pattern of newStylePatterns) {
    const match = cleanedQuery.match(pattern);
    if (match && match[1]) {
      const styleName = match[1].trim();
      if (ignoredWords.includes(styleName.toLowerCase())) continue;

      const styleMatch = findStyleFromString(styleName, availableStyles);
      updateData.newStyle = styleMatch ? styleMatch.style : styleName;
      console.log('[Parse Query API] ✅ Nouveau style détecté:', updateData.newStyle);
      return;
    }
  }
}

/**
 * Extrait le nouveau label ciblé
 */
function extractLabelUpdate(query: string, updateData: UpdateData): void {
  const patterns = [
    /(?:label|label\s+cibl[ée])\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+cibl[ée]\s+(?:à|en|pour)?\s*([A-Za-z0-9_\s]+)/i,
  ];

  const ignoredWords = [
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
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const labelName = match[1].trim();
      if (!ignoredWords.includes(labelName.toLowerCase())) {
        updateData.newLabel = labelName;
        console.log('[Parse Query API] ✅ Nouveau label détecté:', labelName);
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
    /(?:label\s+final|sign[ée])\s+(?:à|en|chez|pour)\s+([A-Za-z0-9_\s]+)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+final\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
    /sign[ée]\s+chez\s+([A-Za-z0-9_\s]+)/i,
  ];

  const ignoredWords = ['projets', 'projet', 'les', 'mes', 'de', 'en', 'le', 'la', 'des', 'final'];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const labelFinalName = match[1].trim();
      if (!ignoredWords.includes(labelFinalName.toLowerCase())) {
        updateData.newLabelFinal = labelFinalName;
        console.log('[Parse Query API] ✅ Nouveau label final détecté:', labelFinalName);
        return;
      }
    }
  }
}
