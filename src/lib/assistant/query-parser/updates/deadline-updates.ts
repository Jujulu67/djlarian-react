/**
 * Extraction des données de deadline depuis les requêtes
 * Gère la suppression, le décalage et la définition de deadlines
 */
import { UpdateData, debugLog } from './types';
import { parseRelativeDate } from '../../parsers/date-parser';

/**
 * Extrait les données de modification de deadline depuis une requête
 */
export function extractDeadlineUpdate(
  query: string,
  lowerQuery: string,
  filters: Record<string, any>,
  updateData: UpdateData
): void {
  // 1. Détecter la suppression de deadlines
  if (extractRemoveDeadline(lowerQuery, filters, updateData)) {
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
  lowerQuery: string,
  filters: Record<string, any>,
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
      filters.hasDeadline = true;
      updateData.hasDeadline = true;
      console.log('[Parse Query API] ✅ Suppression de deadlines détectée');
      return true;
    }
  }
  return false;
}

/**
 * Détecte le décalage de deadlines (push/retarde/avance)
 */
function extractPushDeadline(
  query: string,
  filters: Record<string, any>,
  updateData: UpdateData
): boolean {
  const pushDeadlinePatterns = [
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?une|de\s+une|de\s+(\d+))\s+(semaine|semaines?|week|weeks?)/i,
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?un|de\s+un|de\s+(\d+))\s+(jour|jours?|day|days?)/i,
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+de\s+(\d+)?\s+(mois|month|months?)/i,
    /(?:avance|avancer|prévoit|prévoir)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?une|de\s+une|d[\u2019']?un|de\s+un|de\s+(\d+))\s+(semaine|semaines?|jour|jours?|mois|month|months?)/i,
    /(?:recule|recul|reculer)\s+les\s+deadlines\s+(?:d['\u2019]?une|de\s+une|d['\u2019]?un|de\s+un|de\s+(\d+))\s+(semaine|semaines?|jour|jours?|mois|month|months?)/i,
    /(?:enlève|enlever|enleve|retire|retirer|recul|reculer)\s+(?:une|un|(\d+))?\s+(semaine|semaines?|jour|jours?|mois|month|months?)\s+(?:aux|à\s+les?|des?)\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)/i,
    /(?:enlève|enlever|enleve|retire|retirer|recul|reculer)\s+(?:une|un|(\d+))?\s+(semaine|semaines?|jour|jours?|mois|month|months?)\s+(?:aux|à\s+les?|des?)\s*(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)?/i,
    /(?:push|delay|postpone|move)\s+(?:all\s+)?(?:deadlines?|dates?\s*limites?)\s+by\s+(\d+)?\s*(week|weeks?|day|days?|month|months?)/i,
    /(?:remove|subtract|take\s+off)\s+(\d+)?\s*(week|weeks?|day|days?|month|months?)\s+(?:from|off)\s+(?:all\s+)?(?:deadlines?|dates?\s*limites?)/i,
  ];

  for (const pattern of pushDeadlinePatterns) {
    const match = query.match(pattern);
    if (match) {
      const isNegative =
        /(?:enlève|enlever|enleve|retire|retirer|recul|reculer|remove|subtract|take\s+off)/i.test(
          match[0]
        );

      let amount = 1;
      if (match[1] && !isNaN(parseInt(match[1], 10))) {
        amount = parseInt(match[1], 10);
      }
      if (isNegative) amount = -amount;

      // Trouver l'unité
      let unit = null;
      for (let i = match.length - 1; i >= 2; i--) {
        if (match[i] && /^(semaine|semaines?|jour|jours?|mois|month|months?)$/i.test(match[i])) {
          unit = match[i].toLowerCase();
          break;
        }
      }

      if (!isNaN(amount) && amount !== 0 && unit) {
        filters.hasDeadline = true;
        updateData.hasDeadline = true;
        updateData.pushDeadlineBy = {};

        if (unit.includes('semaine') || unit.includes('week')) {
          updateData.pushDeadlineBy.weeks = amount;
        } else if (unit.includes('jour') || unit.includes('day')) {
          updateData.pushDeadlineBy.days = amount;
        } else if (unit.includes('mois') || unit.includes('month')) {
          updateData.pushDeadlineBy.months = amount;
        }

        console.log(
          '[Parse Query API] ✅ Décalage de deadlines détecté:',
          updateData.pushDeadlineBy
        );
        return true;
      }
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
    /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met|passe|passer)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:des?\s+)?(?:projets?\s+)?(?:à|pour|pour\s+le)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
    /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met)\s+(?:la\s+)?deadline\s+(?:à|pour|pour\s+le)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
    /(?:deadline|date\s*limite)\s+(?:à|pour|pour\s+le)?\s*(la\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
    /(?:met|mets?|définis?|définir)\s+(?:une\s+)?deadline\s+(?:à|pour|pour\s+le)?\s*(dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?))/i,
    /\b(?:au|à\s+le)\s+(?:le\s+)?(mois\s+prochain|next\s+month)\b/i,
    /\b(?:à|pour|pour\s+le)\s+(?:la\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)\b/i,
    /(?:met|mets?|déplace|déplacer|change|changer|modifie|modifier|passe|passer)\s+(?:les?\s+)?(?:deadlines?|dealines?)\s+(?:à|pour|pour\s+le)\s+(?:la\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)/i,
    /^deadline\s+(?:à|pour|pour\s+le)\s*(la\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today)/i,
  ];

  for (const pattern of newDeadlinePatterns) {
    const match = query.match(pattern);
    if (match) {
      const dateStr = (match[2] || match[1]).trim();
      const parsedDate = parseRelativeDate(dateStr);
      if (parsedDate) {
        updateData.newDeadline = parsedDate;
        console.log('[Parse Query API] ✅ Nouvelle deadline détectée:', dateStr, '->', parsedDate);
        return;
      }
    }
  }
}
