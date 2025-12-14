/**
 * Extraction des données de deadline depuis les requêtes
 * Gère la suppression, le décalage et la définition de deadlines
 */
import { UpdateData, debugLog } from './types';
import { parseRelativeDate } from '../../parsers/date-parser';
import {
  BuildAlternationRegexPart,
  UpdateVerbs,
  ScopePronouns,
  FieldAliases,
  TimeUnitsSynonyms,
} from '../nlp-dictionary';

/**
 * Extrait les données de modification de deadline depuis une requête
 */
export function extractDeadlineUpdate(
  query: string,
  lowerQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): void {
  // 1. Détecter la suppression de deadlines
  if (extractRemoveDeadline(query, lowerQuery, filters, updateData)) {
    return;
  }

  // 2. Détecter le décalage de deadlines (push/retarde)
  if (extractPushDeadline(query, filters, updateData)) {
    return;
  }

  // 3. Détecter une nouvelle deadline fixe
  extractNewDeadline(query, updateData);
}

/**
 * Détecte la suppression de deadlines
 */
function extractRemoveDeadline(
  query: string,
  lowerQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): boolean {
  const removeDeadlinePatterns = [
    /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dead-lines?|dates?\s*limites?)/i,
    /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dead-lines?)\s+(?:des?\s+)?(?:projets?|projects?)/i,
    /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?(?:dead|deal|date)[\s-]?lines?/i,
    /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?deal[il]?n?e?s?/i,
  ];

  for (const pattern of removeDeadlinePatterns) {
    if (pattern.test(lowerQuery)) {
      updateData.newDeadline = null;
      // Pour la suppression, on a besoin que les projets aient une deadline
      // Mais on vérifie si c'est un filtre explicite ou juste une conséquence
      const explicitDeadlineFilter = hasExplicitDeadlineFilter(query);
      if (explicitDeadlineFilter) {
        filters.hasDeadline = true;
        updateData.hasDeadline = true;
      } else {
        // Pas de filtre explicite → on ne met PAS hasDeadline dans filters
        updateData.hasDeadline = true;
      }
      console.warn('[Parse Query API] ✅ Suppression de deadlines détectée');
      return true;
    }
  }
  return false;
}

/**
 * Détecte si l'utilisateur a explicitement demandé un filtre deadline
 * (ex: "avec deadline", "qui ont une deadline", "ayant une deadline")
 */
function hasExplicitDeadlineFilter(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  // Patterns pour filtre deadline explicite (scoping)
  const explicitDeadlineFilterPatterns = [
    /(?:avec|qui\s*ont|ayant|qui\s*poss[èe]dent)\s+(?:une\s+)?deadline/i,
    /(?:projets?\s+)?(?:avec|qui\s*ont|ayant)\s+(?:une\s+)?deadline/i,
    /(?:les?\s+)?projets?\s+(?:avec|qui\s*ont|ayant)\s+(?:une\s+)?deadline/i,
    /deadline\s*pr[ée]vue/i,
  ];
  return explicitDeadlineFilterPatterns.some((pattern) => pattern.test(lowerQuery));
}

/**
 * Détecte le décalage de deadlines (push/retarde/avance)
 */
function extractPushDeadline(
  query: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): boolean {
  const lowerQuery = query.toLowerCase();

  // Détecter une intention deadline (debug)
  // Utiliser le dictionnaire NLP pour les verbes et pronoms
  const updateVerbsRegex = BuildAlternationRegexPart(UpdateVerbs);
  const scopePronounsRegex = BuildAlternationRegexPart(ScopePronouns);
  const deadlineAliases = Object.keys(FieldAliases)
    .filter((key) => FieldAliases[key] === 'deadline')
    .map((key) => key.replace(/\s+/g, '\\s*')); // Échapper les espaces pour regex
  const deadlineAliasesRegex = BuildAlternationRegexPart(deadlineAliases as readonly string[]);

  const hasDeadlineIntent =
    new RegExp(deadlineAliasesRegex, 'i').test(query) ||
    new RegExp(
      `(?:${updateVerbsRegex})\\s+(?:${scopePronounsRegex})\\s+(?:${deadlineAliasesRegex})`,
      'i'
    ).test(query);

  // Détecter si l'utilisateur a explicitement demandé un filtre deadline
  const explicitDeadlineFilter = hasExplicitDeadlineFilter(query);

  debugLog('deadline-updates', '🔍 DetectedDeadlineIntent', {
    hasDeadlineIntent,
    explicitDeadlineFilter,
    query: query.substring(0, 100),
  });

  // Patterns améliorés pour supporter "leur deadline", "la deadline", etc.
  const pushDeadlinePatterns = [
    // "pousse leur deadline de 1 mois" / "pousse la deadline d'un mois" / "pousse leur deadline de un mois"
    // Pattern pour semaines avec article ou nombre
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|repousse|repousser|reporte|reporter|ajoute|ajouter)\s+(?:leur|les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?une|de\s+une|d'1|de\s+1|de\s+(\d+))\s+(semaine|semaines?|week|weeks?)/i,
    // Pattern pour jours avec article ou nombre
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|repousse|repousser|reporte|reporter|ajoute|ajouter)\s+(?:leur|les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?un|de\s+un|d'1|de\s+1|de\s+(\d+))\s+(jour|jours?|day|days?)/i,
    // Pattern pour mois avec article ou nombre (IMPORTANT: "de un mois" ou "d'un mois")
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|repousse|repousser|reporte|reporter|ajoute|ajouter)\s+(?:leur|les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?un|de\s+un|d'1|de\s+1|de\s+(\d+))\s+(mois|month|months?)/i,
    // "décale la date limite de 2 semaines" (avec "date limite" au lieu de "deadline")
    /(?:décale|décaler|retarde|retarder|pousse|pousser)\s+(?:leur|les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+(?:date|dates?)\s+limite\s+(?:d[\u2019']?une|de\s+une|d[\u2019']?un|de\s+un|d'1|de\s+1|de\s+(\d+))\s+(semaine|semaines?|jour|jours?|mois|month|months?)/i,
    // "reporte de 10 jours" (sans mention explicite de deadline)
    /(?:reporte|reporter|décal|décaler|retarde|retarder)\s+de\s+(\d+)\s+(jour|jours?|semaine|semaines?|mois|month|months?)/i,
    // "ajoute 1 mois à la deadline"
    /(?:ajoute|ajouter)\s+(\d+)\s+(semaine|semaines?|jour|jours?|mois|month|months?)\s+(?:à|aux?)\s+(?:leur|les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)/i,
    // Patterns avec "toutes les deadlines" (anciens, conservés pour compatibilité)
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?une|de\s+une|de\s+(\d+))\s+(semaine|semaines?|week|weeks?)/i,
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?un|de\s+un|de\s+(\d+))\s+(jour|jours?|day|days?)/i,
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+de\s+(\d+)?\s+(mois|month|months?)/i,
    // Patterns avec "avance" / "prévoit"
    /(?:avance|avancer|prévoit|prévoir)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?une|de\s+une|d[\u2019']?un|de\s+un|de\s+(\d+))\s+(semaine|semaines?|jour|jours?|mois|month|months?)/i,
    // Patterns avec "recule"
    /(?:recule|recul|reculer)\s+les\s+deadlines\s+(?:d['\u2019]?une|de\s+une|d['\u2019]?un|de\s+un|de\s+(\d+))\s+(semaine|semaines?|jour|jours?|mois|month|months?)/i,
    // Patterns avec "enlève" / "retire"
    /(?:enlève|enlever|enleve|retire|retirer|recul|reculer)\s+(?:une|un|(\d+))?\s+(semaine|semaines?|jour|jours?|mois|month|months?)\s+(?:aux|à\s+les?|des?)\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)/i,
    /(?:enlève|enlever|enleve|retire|retirer|recul|reculer)\s+(?:une|un|(\d+))?\s+(semaine|semaines?|jour|jours?|mois|month|months?)\s+(?:aux|à\s+les?|des?)\s*(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)?/i,
    // Patterns anglais
    /(?:push|delay|postpone|move)\s+(?:all\s+)?(?:deadlines?|dates?\s*limites?)\s+by\s+(\d+)?\s*(week|weeks?|day|days?|month|months?)/i,
    /(?:remove|subtract|take\s+off)\s+(\d+)?\s*(week|weeks?|day|days?|month|months?)\s+(?:from|off)\s+(?:all\s+)?(?:deadlines?|dates?\s*limites?)/i,
  ];

  let parsedDelta: { days?: number; weeks?: number; months?: number; years?: number } | null = null;

  for (const pattern of pushDeadlinePatterns) {
    const match = query.match(pattern);
    if (match) {
      const isNegative =
        /(?:enlève|enlever|enleve|retire|retirer|recul|reculer|remove|subtract|take\s+off)/i.test(
          match[0]
        );

      // Parser la quantité (nombre ou article)
      let amount = 1; // Par défaut: 1
      const numberMatch = match[1];
      if (numberMatch && !isNaN(parseInt(numberMatch, 10))) {
        // Nombre explicite (ex: "de 2 semaines")
        amount = parseInt(numberMatch, 10);
      } else {
        // Article "un", "une", "d'un", "d'une" → 1
        const hasArticle = /(?:d[\u2019']?une?|de\s+une?|d'1|de\s+1|une|un)/i.test(match[0]);
        if (hasArticle) {
          amount = 1;
        }
        // Si aucun nombre ni article, on garde 1 par défaut
      }

      if (isNegative) amount = -amount;

      // Trouver l'unité
      let unit = null;
      for (let i = match.length - 1; i >= 2; i--) {
        if (
          match[i] &&
          /^(semaine|semaines?|jour|jours?|mois|month|months?|an|ans?|année|années?|year|years?)$/i.test(
            match[i]
          )
        ) {
          unit = match[i].toLowerCase();
          break;
        }
      }

      if (!isNaN(amount) && amount !== 0 && unit) {
        parsedDelta = {};

        // Utiliser le dictionnaire TimeUnitsSynonyms pour mapper l'unité
        const normalizedUnit = unit.toLowerCase();
        const timeUnit = TimeUnitsSynonyms[normalizedUnit];
        if (timeUnit) {
          if (timeUnit.days) parsedDelta.days = amount * timeUnit.days;
          if (timeUnit.weeks) parsedDelta.weeks = amount * timeUnit.weeks;
          if (timeUnit.months) parsedDelta.months = amount * timeUnit.months;
          if (timeUnit.years) parsedDelta.years = amount * timeUnit.years;
        } else {
          // Fallback pour compatibilité (ne devrait pas arriver si le dictionnaire est complet)
          if (unit.includes('semaine') || unit.includes('week')) {
            parsedDelta.weeks = amount;
          } else if (unit.includes('jour') || unit.includes('day')) {
            parsedDelta.days = amount;
          } else if (unit.includes('mois') || unit.includes('month')) {
            parsedDelta.months = amount;
          } else if (unit.includes('an') || unit.includes('année') || unit.includes('year')) {
            parsedDelta.years = amount;
          }
        }

        debugLog('deadline-updates', '📊 ParsedDelta', {
          parsedDelta,
          amount,
          unit,
          isNegative,
          matchedPattern: pattern.toString(),
        });

        // IMPORTANT: Ne mettre hasDeadline dans filters QUE si l'utilisateur l'a explicitement demandé
        // Sinon, c'est juste une conséquence de la mutation (on modifie la deadline, donc on a besoin qu'elle existe)
        // mais ce n'est PAS un filtre scoping qui doit remplacer le working set
        if (explicitDeadlineFilter) {
          // Filtre explicite demandé par l'utilisateur → c'est un filtre scoping
          filters.hasDeadline = true;
          updateData.hasDeadline = true;
          debugLog('deadline-updates', '✅ ExplicitDeadlineFilter', {
            reason: 'User explicitly requested deadline filter',
          });
        } else {
          // Pas de filtre explicite → on ne met PAS hasDeadline dans filters
          // La mutation nécessite une deadline existante, mais ce n'est pas un filtre scoping
          // On garde hasDeadline dans updateData pour information, mais pas dans filters
          updateData.hasDeadline = true;
          debugLog('deadline-updates', '✅ MutationQualifierOnly', {
            reason: 'hasDeadline is mutation qualifier, not scoping filter',
            filtersHasDeadline: filters.hasDeadline,
          });
        }

        updateData.pushDeadlineBy = parsedDelta;

        console.warn(
          '[Parse Query API] ✅ Décalage de deadlines détecté:',
          updateData.pushDeadlineBy,
          explicitDeadlineFilter
            ? '(avec filtre deadline explicite)'
            : '(sans filtre deadline explicite)'
        );

        debugLog('deadline-updates', '✅ FinalUpdateData', {
          pushDeadlineBy: updateData.pushDeadlineBy,
          hasDeadline: updateData.hasDeadline,
          explicitDeadlineFilter,
          filtersHasDeadline: filters.hasDeadline,
        });

        return true;
      }
    }
  }

  // Si on a détecté une intention deadline mais pas de mutation, logger pourquoi
  if (hasDeadlineIntent && !updateData.pushDeadlineBy) {
    debugLog('deadline-updates', '❌ WhyNoMutation', {
      query: query.substring(0, 100),
      reason: 'No valid delta pattern matched',
      hasDeadlineKeyword: /deadline|date\s*limite/i.test(query),
      hasPushVerb: /(?:pousse|déplace|retarde|décal|repousse|reporte|ajoute)/i.test(query),
    });
  }

  return false;
}

/**
 * Extrait une nouvelle deadline fixe
 */
function extractNewDeadline(query: string, updateData: UpdateData): void {
  if (updateData.newDeadline !== undefined || updateData.pushDeadlineBy !== undefined) {
    return;
  }

  const newDeadlinePatterns = [
    /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met|passe|passer|cahnge|chnage|chang|pase|pass|modifi)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:des?\s+)?(?:projets?\s+)?(?:à|pour|pour\s+le|au)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met|cahnge|chnage|chang|pase|pass|modifi)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?deadline\s+(?:à|pour|pour\s+le|au)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:deadline|date\s*limite)\s+(?:à|pour|pour\s+le|au)?\s*(?:(?:la|le)\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:met|mets?|définis?|définir|fixe|fixer)\s+(?:(?:une|la|le|l'|ma|ta)\s+)?deadline\s+(?:à|pour|pour\s+le|au)?\s*(dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?))/i,
    /\b(?:au|à\s+le)\s+(?:le\s+)?(mois\s+prochain|next\s+month)\b/i,
    /\b(?:à|pour|pour\s+le)\s+(?:(?:la|le)\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)\b/i,
    /(?:met|mets?|déplace|déplacer|change|changer|modifie|modifier|passe|passer|cahnge|chnage|chang|pase|pass|modifi)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:deadlines?|dealines?)\s+(?:à|pour|pour\s+le)\s+(?:(?:la|le)\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)/i,
    /^deadline\s+(?:à|pour|pour\s+le|au)\s*(?:(?:la|le)\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today)/i,
  ];

  for (const pattern of newDeadlinePatterns) {
    const match = query.match(pattern);
    if (match) {
      const dateStr = (match[2] || match[1]).trim();
      const parsedDate = parseRelativeDate(dateStr);
      if (parsedDate) {
        updateData.newDeadline = parsedDate;
        console.warn('[Parse Query API] ✅ Nouvelle deadline détectée:', dateStr, '->', parsedDate);
        return;
      }
    }
  }
}
