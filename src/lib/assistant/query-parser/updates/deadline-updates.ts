/**
 * Extraction des données de deadline depuis les requêtes
 * Gère la suppression, le décalage et la définition de deadlines
 */
import { UpdateData, debugLog } from './types';
import { parseRelativeDate } from '../../parsers/date-parser';
import { TimeUnitsSynonyms } from '../nlp-dictionary';
import { logger } from '@/lib/logger';

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
      logger.warn('[Parse Query API] ✅ Suppression de deadlines détectée');
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
type DeadlineDelta = { days?: number; weeks?: number; months?: number; years?: number };

const PUSH_DEADLINE_PATTERNS = [
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

const NEGATIVE_SHIFT_PATTERN =
  /(?:enlève|enlever|enleve|retire|retirer|recul|reculer|remove|subtract|take\s+off)/i;
const TIME_UNIT_PATTERN =
  /^(semaine|semaines?|jour|jours?|mois|month|months?|an|ans?|année|années?|year|years?)$/i;
const DELTA_UNITS = ['days', 'weeks', 'months', 'years'] as const;

/** Décalage pour une quantité et une unité, d'après le dictionnaire TimeUnitsSynonyms. */
function buildDelta(amount: number, unit: string): DeadlineDelta {
  const parsedDelta: DeadlineDelta = {};
  const timeUnit = TimeUnitsSynonyms[unit];
  if (timeUnit) {
    for (const key of DELTA_UNITS) {
      const factor = timeUnit[key];
      if (factor) parsedDelta[key] = amount * factor;
    }
    return parsedDelta;
  }
  // Secours si le dictionnaire ne connaît pas l'unité
  if (unit.includes('semaine') || unit.includes('week')) {
    parsedDelta.weeks = amount;
  } else if (unit.includes('jour') || unit.includes('day')) {
    parsedDelta.days = amount;
  } else if (unit.includes('mois') || unit.includes('month')) {
    parsedDelta.months = amount;
  } else if (unit.includes('an') || unit.includes('année') || unit.includes('year')) {
    parsedDelta.years = amount;
  }
  return parsedDelta;
}

/** Décalage demandé par un motif reconnu, ou null sans quantité ni unité exploitable. */
function parseDeadlineDelta(match: RegExpMatchArray): DeadlineDelta | null {
  // Un nombre explicite (« de 2 semaines »), sinon un article (« un », « une ») ou rien : 1
  const count = Number.parseInt(match[1], 10);
  const magnitude = match[1] && !Number.isNaN(count) ? count : 1;
  const amount = NEGATIVE_SHIFT_PATTERN.test(match[0]) ? -magnitude : magnitude;
  if (amount === 0) return null;

  // L'unité est le dernier groupe capturé qui en a la forme
  const unit = match
    .slice(2)
    .reverse()
    .find((group) => group && TIME_UNIT_PATTERN.test(group));
  return unit ? buildDelta(amount, unit.toLowerCase()) : null;
}

function extractPushDeadline(
  query: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): boolean {
  for (const pattern of PUSH_DEADLINE_PATTERNS) {
    const match = query.match(pattern);
    const delta = match && parseDeadlineDelta(match);
    if (delta) {
      // hasDeadline qualifie la mutation (il faut une deadline à décaler). Il ne devient un
      // filtre, qui remplacerait le working set, que si l'utilisateur l'a demandé explicitement.
      if (hasExplicitDeadlineFilter(query)) filters.hasDeadline = true;
      updateData.hasDeadline = true;
      updateData.pushDeadlineBy = delta;
      debugLog('deadline-updates', '✅ FinalUpdateData', {
        pushDeadlineBy: delta,
        filtersHasDeadline: filters.hasDeadline,
      });
      return true;
    }
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
    /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met|passe|passer|cahnge|chnage|chang|pase|pass|modifi)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:des?\s+)?(?:projets?\s+)?(?:à|pour|pour\s+le|au)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['’]hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met|cahnge|chnage|chang|pase|pass|modifi)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?deadline\s+(?:à|pour|pour\s+le|au)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['’]hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:deadline|date\s*limite)\s+(?:à|pour|pour\s+le|au)?\s*(?:(?:la|le)\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['’]hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:met|mets?|définis?|définir|fixe|fixer)\s+(?:(?:une|la|le|l'|ma|ta)\s+)?deadline\s+(?:à|pour|pour\s+le|au)?\s*(dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?))/i,
    /\b(?:au|à\s+le)\s+(?:le\s+)?(mois\s+prochain|next\s+month)\b/i,
    /\b(?:à|pour|pour\s+le)\s+(?:(?:la|le)\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)\b/i,
    /(?:met|mets?|déplace|déplacer|change|changer|modifie|modifier|passe|passer|cahnge|chnage|chang|pase|pass|modifi)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:deadlines?|dealines?)\s+(?:à|pour|pour\s+le)\s+(?:(?:la|le)\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)/i,
    /^deadline\s+(?:à|pour|pour\s+le|au)\s*(?:(?:la|le)\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['’]hui|today)/i,
  ];

  for (const pattern of newDeadlinePatterns) {
    const match = query.match(pattern);
    if (match) {
      const dateStr = (match[2] || match[1]).trim();
      const parsedDate = parseRelativeDate(dateStr);
      if (parsedDate) {
        updateData.newDeadline = parsedDate;
        logger.warn('[Parse Query API] ✅ Nouvelle deadline détectée:', dateStr, '->', parsedDate);
        return;
      }
    }
  }
}
