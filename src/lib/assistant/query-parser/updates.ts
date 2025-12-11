/**
 * Extraction des données de mise à jour depuis les requêtes
 */
import { parseRelativeDate } from '../parsers/date-parser';
import { findStyleFromString } from '../parsers/style-matcher';

export interface UpdateData {
  // Filtres pour identifier les projets à modifier
  minProgress?: number;
  maxProgress?: number;
  status?: string;
  hasDeadline?: boolean;
  deadlineDate?: string;
  noProgress?: boolean;
  collab?: string;
  style?: string;
  label?: string;
  labelFinal?: string;
  // Nouvelles valeurs à appliquer
  newProgress?: number;
  newStatus?: string;
  newDeadline?: string | null;
  pushDeadlineBy?: {
    days?: number;
    weeks?: number;
    months?: number;
  };
  newCollab?: string;
  newStyle?: string;
  newLabel?: string;
  newLabelFinal?: string;
}

/**
 * Patterns de statuts pour la détection
 */
const statusPatterns: { pattern: RegExp; status: string }[] = [
  { pattern: /ghost\s*prod(?:uction)?|ghostprod|gost\s*prod/i, status: 'GHOST_PRODUCTION' },
  {
    pattern: /termin[ée]s?|finis?|complet[ée]?s?|finished|completed|done|100\s*%|TERMINE/i,
    status: 'TERMINE',
  },
  { pattern: /annul[ée]s?|cancel(?:led)?|abandonn[ée]s?|dropped/i, status: 'ANNULE' },
  {
    pattern:
      /en\s*cours|ongoing|actifs?|in\s*(?:progress|the\s*works)|current|active|wip|EN\s*COURS|EN_COURS/i,
    status: 'EN_COURS',
  },
  {
    pattern: /en\s*attente|pending|waiting|on\s*hold|pause|EN\s*ATTENTE|EN_ATTENTE/i,
    status: 'EN_ATTENTE',
  },
  { pattern: /archiv[ée]s?|archived/i, status: 'ARCHIVE' },
  { pattern: /rework|[àa]\s*refaire|retravailler|needs?\s*work/i, status: 'A_REWORK' },
];

/**
 * Extrait les données de mise à jour depuis une requête
 */
export function extractUpdateData(
  query: string,
  lowerQuery: string,
  filters: Record<string, any>,
  availableStyles: string[]
): UpdateData | null {
  const updateData: UpdateData = {};

  // Détecter "de X% à Y" comme pattern spécial (filtre X%, nouvelle valeur Y)
  // Exemple: "passe les projets de 10% à 15"
  const deXaYPattern = /(?:de|depuis)\s+(\d+)\s*%\s+à\s+(\d+)(?:\s*%|$)/i;
  const deXaYMatch = query.match(deXaYPattern);
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
      console.log(
        '[Parse Query API] ✅ Pattern "de X% à Y" détecté:',
        `filtre=${filterValue}%, nouvelle valeur=${newValue}%`
      );
    }
  }

  // Extraire les filtres de progression (pour identifier les projets à modifier)
  // Ces filtres sont déjà dans l'objet filters, on les réutilise
  if (filters.minProgress !== undefined) {
    updateData.minProgress = filters.minProgress;
  }
  if (filters.maxProgress !== undefined) {
    updateData.maxProgress = filters.maxProgress;
  }
  if (filters.noProgress) {
    updateData.noProgress = true;
  }

  // Extraire le statut de filtre (pour identifier les projets)
  if (filters.status) {
    updateData.status = filters.status;
  }

  // Extraire hasDeadline
  if (filters.hasDeadline !== undefined) {
    updateData.hasDeadline = filters.hasDeadline;
  }

  // Extraire collab (filtre)
  if (filters.collab) {
    updateData.collab = filters.collab;
  }

  // Extraire style (filtre)
  if (filters.style) {
    updateData.style = filters.style;
  }

  // Extraire label (filtre)
  if (filters.label) {
    updateData.label = filters.label;
  }

  // Extraire labelFinal (filtre)
  if (filters.labelFinal) {
    updateData.labelFinal = filters.labelFinal;
  }

  // Extraire la nouvelle progression à appliquer
  // On cherche la nouvelle valeur APRÈS les filtres
  // Patterns pour détecter la nouvelle valeur (doit être après "à" ou "en" et après les filtres)
  // Exemples: "met à jour les projets à 5% à 7%" -> newProgress: 7
  //           "passe les projets sans avancement à 0%" -> newProgress: 0
  //           "modifie les projets à 100% en TERMINE" -> pas de newProgress (juste statut)
  //           "passe les projets de 10% à 15" -> newProgress: 15 (déjà détecté par pattern "de X% à Y")

  // Si on a déjà détecté une nouvelle valeur avec le pattern "de X% à Y", on skip les autres détections
  const skipNewProgressDetection = updateData.newProgress !== undefined;

  // Si on a déjà détecté une nouvelle valeur avec le pattern "de X% à Y", on skip les autres détections
  if (!skipNewProgressDetection) {
    // Chercher d'abord les patterns explicites de nouvelle valeur
    const explicitNewProgressPatterns = [
      // "à X%" à la fin de la phrase (probablement la nouvelle valeur)
      /(?:à|en)\s+(\d+)\s*%\s*$/i,
      // "mets à X%" ou "passe à X%" (nouvelle valeur explicite) - doit être après "projets" ou directement après le verbe
      /(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)\s*%?/i,
      // "en X%" après un verbe de modification
      /(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?[^à]*\s+(?:à|en)\s+(\d+)\s*%?/i,
      // Pattern spécifique pour "passe les projets à X%" quand X% n'est pas utilisé comme filtre
      /(?:passe|met|mets?|change|changer|modifie|modifier)\s+(?:les?\s+)?projets?\s+(?:à|en)\s+(\d+)\s*%?/i,
    ];

    // Chercher toutes les occurrences de pourcentages dans la requête
    const allPercentMatches = Array.from(query.matchAll(/(\d+)\s*%/gi));

    // Chercher aussi les nombres sans % qui pourraient être la nouvelle valeur
    // Patterns: "mets à 10", "passe à 10", "change à 10", "mets les à 10", etc.
    // On cherche après tous les filtres pour trouver la nouvelle valeur
    const numberWithoutPercentPatterns = [
      // "mets les à 10" ou "mets à 10" (après "les projets à X%")
      /(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)(?:\s|$)/i,
      // "à 10" à la fin de la phrase
      /(?:à|en)\s+(\d+)\s*$/i,
      // "à 10" après "et" (ex: "projets à 7% et mets les à 10")
      /et\s+(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)/i,
    ];

    let newProgressFromNumber = undefined;
    for (const pattern of numberWithoutPercentPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const value = parseInt(match[1], 10);
        if (!isNaN(value) && value >= 0 && value <= 100) {
          // Vérifier que ce n'est pas déjà utilisé comme filtre
          const isUsedAsFilter =
            (filters.minProgress !== undefined && filters.minProgress === value) ||
            (filters.maxProgress !== undefined && filters.maxProgress === value);
          if (!isUsedAsFilter) {
            newProgressFromNumber = value;
            console.log(
              '[Parse Query API] ✅ Nouvelle progression détectée (nombre sans %):',
              value
            );
            break;
          }
        }
      }
    }

    if (allPercentMatches.length > 0) {
      console.log(
        '[Parse Query API] 🔍 Tous les pourcentages trouvés:',
        allPercentMatches.map((m) => ({
          value: m[1],
          index: m.index,
          text: m[0],
        }))
      );

      // Si on a plusieurs pourcentages, le dernier est probablement la nouvelle valeur
      // Sauf si c'est clairement un filtre (ex: "à 5% d'avancement")
      const lastPercentMatch = allPercentMatches[allPercentMatches.length - 1];
      const lastPercentValue = parseInt(lastPercentMatch[1], 10);
      const lastPercentIndex = lastPercentMatch.index || 0;
      const textAfterLastPercent = query
        .substring(lastPercentIndex + lastPercentMatch[0].length)
        .toLowerCase();

      console.log('[Parse Query API] 🔍 Dernier pourcentage:', {
        value: lastPercentValue,
        textAfter: textAfterLastPercent,
        isUsedAsFilter:
          (filters.minProgress !== undefined && filters.minProgress === lastPercentValue) ||
          (filters.maxProgress !== undefined && filters.maxProgress === lastPercentValue),
      });

      // Si le dernier pourcentage est suivi de rien ou de peu de texte, c'est probablement la nouvelle valeur
      // Si c'est suivi de "d'avancement" ou "de progress", c'est un filtre
      const isFollowedByProgressKeyword = /d['']?avancement|de\s+progress|de\s+progression/i.test(
        textAfterLastPercent
      );

      // Vérifier si c'est suivi d'une date/deadline (ex: "au mois prochain", "demain", etc.)
      const isFollowedByDate =
        /\b(?:au|à\s+le|pour|pour\s+le)\s+(?:le\s+)?(?:mois\s+prochain|semaine\s+pro|semaine\s+prochaine|next\s+month|next\s+week|demain|tomorrow|aujourd['']hui|today)/i.test(
          textAfterLastPercent
        );

      if (
        !isFollowedByProgressKeyword &&
        (!textAfterLastPercent.trim() ||
          textAfterLastPercent.trim().length < 10 ||
          isFollowedByDate)
      ) {
        // Vérifier que ce n'est pas déjà utilisé comme filtre
        const isUsedAsFilter =
          (filters.minProgress !== undefined && filters.minProgress === lastPercentValue) ||
          (filters.maxProgress !== undefined && filters.maxProgress === lastPercentValue);

        if (
          !isUsedAsFilter &&
          !isNaN(lastPercentValue) &&
          lastPercentValue >= 0 &&
          lastPercentValue <= 100
        ) {
          // Si on a déjà trouvé une nouvelle valeur sans %, prioriser celle avec %
          if (newProgressFromNumber === undefined) {
            updateData.newProgress = lastPercentValue;
            console.log(
              '[Parse Query API] ✅ Nouvelle progression détectée (dernier %):',
              lastPercentValue,
              isFollowedByDate ? "(suivi d'une date)" : ''
            );
          }
        }
      } else {
        console.log('[Parse Query API] ⚠️ Dernier pourcentage ignoré (filtre ou suivi de mot-clé)');
      }
    }

    // Si on a trouvé une nouvelle valeur sans %, l'utiliser (priorité sur les %)
    if (newProgressFromNumber !== undefined) {
      updateData.newProgress = newProgressFromNumber;
    }

    // Si on n'a pas trouvé avec la méthode précédente, essayer les patterns explicites
    if (updateData.newProgress === undefined) {
      for (const pattern of explicitNewProgressPatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          const progressValue = parseInt(match[1], 10);
          if (!isNaN(progressValue) && progressValue >= 0 && progressValue <= 100) {
            // Vérifier que ce n'est pas déjà utilisé comme filtre
            const isUsedAsFilter =
              (filters.minProgress !== undefined && filters.minProgress === progressValue) ||
              (filters.maxProgress !== undefined && filters.maxProgress === progressValue);

            // Si c'est utilisé comme filtre ET qu'on a un verbe de modification,
            // c'est probablement aussi la nouvelle valeur (ex: "passe les projets à 15%" = filtre 15% ET newProgress 15%)
            const hasUpdateVerb =
              /(?:passe|met|mets?|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?|deadlines?)/i.test(
                query
              );

            // Si c'est un filtre mais qu'on a un verbe de modification, c'est aussi la nouvelle valeur
            // Sauf si on a déjà détecté une autre nouvelle valeur
            if (!isUsedAsFilter || (isUsedAsFilter && hasUpdateVerb)) {
              updateData.newProgress = progressValue;
              console.log(
                '[Parse Query API] ✅ Nouvelle progression détectée (pattern explicite):',
                progressValue,
                isUsedAsFilter ? '(également utilisé comme filtre)' : ''
              );
              break;
            }
          }
        }
      }
    }
  }

  // Détecter "sans avancement" ou "null" comme nouvelle valeur (0%)
  // Si on n'a pas déjà détecté une nouvelle valeur et qu'on trouve "sans avancement" après un verbe de modification
  if (
    updateData.newProgress === undefined &&
    /(?:passe|mets?|met|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:sans\s*avancement|sans\s*progression|pas\s*d['']?avancement|no\s*progress|null)/i.test(
      lowerQuery
    )
  ) {
    updateData.newProgress = 0;
  }

  // Extraire le nouveau statut à appliquer
  // Patterns pour détecter "en TERMINE", "à TERMINE", "marque TERMINE", "à EN COURS", etc.
  // Supporte les statuts en majuscules (EN COURS, EN ATTENTE, TERMINE)
  for (const { pattern, status } of statusPatterns) {
    // Chercher si le statut apparaît après un verbe de modification
    // Patterns: "passe en TERMINE", "met à EN COURS", "change en EN ATTENTE", etc.
    const updateVerbPatterns = [
      new RegExp(
        `(?:marque|marquer|mets?|met|change|changer|modifie|modifier|passe|passer)\\s+(?:les?\\s+)?(?:projets?\\s+)?(?:en|à|comme|as)\\s+${pattern.source}`,
        'i'
      ),
      new RegExp(`(?:set|update|change|mark)\\s+(?:to|as)\\s+${pattern.source}`, 'i'),
      // Pattern pour les statuts en majuscules directement après "à" ou "en"
      // Supporte à la fois "EN_COURS" et "EN COURS"
      new RegExp(
        `(?:marque|marquer|mets?|met|change|changer|modifie|modifier|passe|passer)\\s+(?:les?\\s+)?(?:projets?\\s+)?(?:en|à)\\s+(${status.replace(/_/g, '[\\s_]').replace(/\s+/g, '[\\s_]+')})`,
        'i'
      ),
    ];

    for (const updateVerbPattern of updateVerbPatterns) {
      if (updateVerbPattern.test(query)) {
        updateData.newStatus = status;
        console.log('[Parse Query API] ✅ Nouveau statut détecté:', status);
        break;
      }
    }
    if (updateData.newStatus) break;
  }

  // Détecter la suppression de deadlines (AVANT la détection de nouvelle deadline)
  // Tolère les fautes d'orthographe : "dealines", "dead line", "dead-line", etc.
  const removeDeadlinePatterns = [
    // Patterns avec variations exactes
    /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dead-lines?|dates?\s*limites?)/i,
    /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dead-lines?)\s+(?:des?\s+)?(?:projets?|projects?)/i,
    // Pattern flexible : "dead" ou "deal" (faute) suivi de "line(s)" avec ou sans espace/tiret
    /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?(?:dead|deal|date)[\s-]?lines?/i,
    // Pattern pour "dealines" : "deal" suivi de quelque chose qui ressemble à "lines" (tolère "ines" comme faute)
    /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?deal[il]?n?e?s?/i,
  ];

  for (let i = 0; i < removeDeadlinePatterns.length; i++) {
    const pattern = removeDeadlinePatterns[i];
    const matches = pattern.test(lowerQuery);
    console.log(
      `[Parse Query API] 🔍 Test pattern suppression deadline ${i + 1}:`,
      pattern,
      '→ match:',
      matches,
      'pour:',
      lowerQuery
    );
    if (matches) {
      updateData.newDeadline = null; // null indique la suppression
      // Filtrer les projets qui ont des deadlines pour les modifier
      filters.hasDeadline = true;
      updateData.hasDeadline = true;
      console.log('[Parse Query API] ✅ Suppression de deadlines détectée');
      break;
    }
  }

  // Détecter le décalage de deadlines (AVANT la détection de nouvelle deadline fixe)
  // Patterns: "pousse toutes les deadlines d'une semaine", "push deadlines by 1 week", etc.
  // Patterns pour AVANCER (positif) et RECULER (négatif) les deadlines
  const pushDeadlinePatterns = [
    // FR: "pousse (toutes les) deadlines d'une semaine" / "de X semaines" (AVANCER)
    // Match "d'une", "d'une", "de une", "de 1", "de 2 semaines", etc.
    // Utilise [\u2019'] pour matcher les différents types d'apostrophes
    // Le pattern (?:toutes?\s+)?les?\s+ permet "toutes les", "toutes", "les", ou rien
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?une|de\s+une|de\s+(\d+))\s+(semaine|semaines?|week|weeks?)/i,
    // FR: "pousse (toutes les) deadlines de X jours" (AVANCER)
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?un|de\s+un|de\s+(\d+))\s+(jour|jours?|day|days?)/i,
    // FR: "pousse (toutes les) deadlines de X mois" (AVANCER)
    /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+de\s+(\d+)?\s+(mois|month|months?)/i,
    // FR: "avance/prévoit (les) deadlines d'une/de X semaine(s)/jour(s)/mois" (AVANCER)
    // Pattern pour "avance les deadlines d'une semaine" (ordre: verbe + deadlines + quantité)
    /(?:avance|avancer|prévoit|prévoir)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?une|de\s+une|d[\u2019']?un|de\s+un|de\s+(\d+))\s+(semaine|semaines?|jour|jours?|mois|month|months?)/i,
    // FR: "recule (les) deadlines d'une/de X semaine(s)/jour(s)/mois" (RECULER - négatif)
    // Pattern pour "recule les deadlines d'une semaine" (ordre: verbe + deadlines + quantité)
    // DOIT être placé AVANT les patterns "enlève une semaine aux deadlines" pour éviter les conflits
    // Supporte "recule" (conjugué), "recul" (impératif), "reculer" (infinitif)
    /(?:recule|recul|reculer)\s+les\s+deadlines\s+(?:d['\u2019]?une|de\s+une|d['\u2019]?un|de\s+un|de\s+(\d+))\s+(semaine|semaines?|jour|jours?|mois|month|months?)/i,
    // FR: "enlève/enleve/retire (une/X) semaine(s)/jour(s)/mois aux deadlines" (RECULER - négatif)
    // Supporte "enlève" (avec accent) et "enleve" (sans accent)
    /(?:enlève|enlever|enleve|retire|retirer|recul|reculer)\s+(?:une|un|(\d+))?\s+(semaine|semaines?|jour|jours?|mois|month|months?)\s+(?:aux|à\s+les?|des?)\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)/i,
    // FR: "enlève/enleve/retire (une/X) semaine(s)/jour(s)/mois" (RECULER - négatif, sans "aux deadlines")
    /(?:enlève|enlever|enleve|retire|retirer|recul|reculer)\s+(?:une|un|(\d+))?\s+(semaine|semaines?|jour|jours?|mois|month|months?)\s+(?:aux|à\s+les?|des?)\s*(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)?/i,
    // EN: "push (all) deadlines by X weeks/days/months" (AVANCER)
    /(?:push|delay|postpone|move)\s+(?:all\s+)?(?:deadlines?|dates?\s*limites?)\s+by\s+(\d+)?\s*(week|weeks?|day|days?|month|months?)/i,
    // EN: "remove/subtract X weeks/days/months from deadlines" (RECULER - négatif)
    /(?:remove|subtract|take\s+off)\s+(\d+)?\s*(week|weeks?|day|days?|month|months?)\s+(?:from|off)\s+(?:all\s+)?(?:deadlines?|dates?\s*limites?)/i,
  ];

  for (let i = 0; i < pushDeadlinePatterns.length; i++) {
    const pattern = pushDeadlinePatterns[i];
    const match = query.match(pattern);
    console.log(
      `[Parse Query API] 🔍 Test pattern push deadline ${i + 1}:`,
      pattern,
      '→ match:',
      match,
      'pour:',
      query
    );
    if (match) {
      // Détecter si c'est un décalage négatif (enlève, enleve, retire, recul, reculer, remove, subtract)
      const isNegative =
        /(?:enlève|enlever|enleve|retire|retirer|recul|reculer|remove|subtract|take\s+off)/i.test(
          match[0]
        );

      // Le nombre peut être dans match[1] (pour les patterns avec nombre explicite)
      // Si pas de nombre explicite mais qu'on a "d'une", "d'un", "une", "un", c'est 1
      let amount = 1; // Par défaut 1
      if (match[1] && !isNaN(parseInt(match[1], 10))) {
        amount = parseInt(match[1], 10);
      } else {
        // Vérifier si le texte matche contient "d'une", "d'un", "une", "un"
        const matchedText = match[0].toLowerCase();
        if (
          matchedText.includes("d'une") ||
          matchedText.includes("d'un") ||
          /(?:^|\s)(?:une|un)(?:\s|$)/.test(matchedText)
        ) {
          amount = 1;
        }
      }

      // Si c'est négatif, rendre le montant négatif
      if (isNegative) {
        amount = -amount;
      }

      // L'unité peut être dans différents groupes selon le pattern
      // Pour "recule les deadlines d'une semaine", l'unité est dans le dernier groupe de capture
      // Pour les patterns avec nombre explicite, l'unité est généralement dans match[2] ou match[3]
      // Pour les patterns sans nombre (d'une, d'un), l'unité est dans match[2]
      // Chercher dans tous les groupes de capture possibles
      let unit = null;
      // Commencer par la fin (dernier groupe de capture)
      for (let i = match.length - 1; i >= 2; i--) {
        if (match[i] && /^(semaine|semaines?|jour|jours?|mois|month|months?)$/i.test(match[i])) {
          unit = match[i].toLowerCase();
          break;
        }
      }

      console.log('[Parse Query API] 🔍 Analyse match:', {
        match: match[0],
        amount,
        unit,
        isNegative,
        matchGroups: match,
      });

      if (!isNaN(amount) && amount !== 0 && unit) {
        // Filtrer les projets qui ont des deadlines pour les modifier
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
        break;
      }
    }
  }

  // Extraire la nouvelle deadline (seulement si pas de suppression ni de décalage détecté)
  if (updateData.newDeadline === undefined && updateData.pushDeadlineBy === undefined) {
    const newDeadlinePatterns = [
      /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met|passe|passer)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:des?\s+)?(?:projets?\s+)?(?:à|pour|pour\s+le)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
      /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met)\s+(?:la\s+)?deadline\s+(?:à|pour|pour\s+le)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
      /(?:deadline|date\s*limite)\s+(?:à|pour|pour\s+le)?\s*(la\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
      // Pattern spécifique pour "met une deadline à dans X mois"
      /(?:met|mets?|définis?|définir)\s+(?:une\s+)?deadline\s+(?:à|pour|pour\s+le)?\s*(dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?))/i,
      // Pattern pour détecter "au mois prochain" même après d'autres informations (ex: "à 15% au mois prochain")
      // Cherche "au mois prochain" ou "au le mois prochain" n'importe où dans la requête
      /\b(?:au|à\s+le)\s+(?:le\s+)?(mois\s+prochain|next\s+month)\b/i,
      // Pattern pour "à la semaine prochaine" ou "à semaine prochaine"
      /\b(?:à|pour|pour\s+le)\s+(?:la\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)\b/i,
      // Pattern pour "met les deadlines à la semaine prochaine" (avec verbe)
      /(?:met|mets?|déplace|déplacer|change|changer|modifie|modifier|passe|passer)\s+(?:les?\s+)?(?:deadlines?|dealines?)\s+(?:à|pour|pour\s+le)\s+(?:la\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)/i,
      // Pattern simple pour "deadline à X" (sans verbe de modification)
      // Doit être détecté comme une commande de mise à jour
      /^deadline\s+(?:à|pour|pour\s+le)\s*(la\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today)/i,
    ];

    console.log('[Parse Query API] 🔍 Test patterns nouvelle deadline pour:', query);
    for (let i = 0; i < newDeadlinePatterns.length; i++) {
      const pattern = newDeadlinePatterns[i];
      const match = query.match(pattern);
      console.log(
        `[Parse Query API] 🔍 Test pattern deadline ${i + 1}:`,
        pattern,
        '→ match:',
        match
      );
      if (match) {
        // Le groupe 1 peut être "la" ou la date, le groupe 2 est la date si "la" est présent
        const dateStr = (match[2] || match[1]).trim();
        console.log('[Parse Query API] 🔍 Date string extraite:', dateStr);
        const parsedDate = parseRelativeDate(dateStr);
        console.log('[Parse Query API] 🔍 Date parsée:', parsedDate);
        if (parsedDate) {
          updateData.newDeadline = parsedDate;
          console.log(
            '[Parse Query API] ✅ Nouvelle deadline détectée:',
            dateStr,
            '->',
            parsedDate
          );
          break;
        }
      }
    }
  }

  // Extraire le nouveau collaborateur
  // D'abord, détecter le pattern spécial "en collab avec X à Y" (filtre X, nouvelle valeur Y)
  // Supporte aussi "collab avec X à Y" (sans "en")
  // Le pattern doit gérer les espaces dans les noms (ex: "Daft Punk")
  // Utiliser des patterns non-greedy avec des limites de mots pour mieux capturer
  const collabFilterToNewPatterns = [
    /(?:en\s+)?(?:collab|collaborateur)\s+avec\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
    /(?:collab|collaborateur)\s+avec\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
    // Pattern alternatif pour "en collab avec X à Y" avec meilleure gestion des espaces
    /en\s+collab\s+avec\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
  ];

  let collabFilterToNewMatch = null;
  for (const pattern of collabFilterToNewPatterns) {
    collabFilterToNewMatch = query.match(pattern);
    if (collabFilterToNewMatch) break;
  }

  if (collabFilterToNewMatch) {
    const filterCollab = collabFilterToNewMatch[1].trim();
    let newCollab = collabFilterToNewMatch[2].trim();
    // Ignorer les mots-clés communs
    const ignoredWords = ['projets', 'projet', 'les', 'mes', 'de', 'en', 'le', 'la', 'des', 'avec'];
    // Nettoyer le nom du collaborateur (enlever "avec" au début ou à la fin)
    if (newCollab.toLowerCase().startsWith('avec ')) {
      newCollab = newCollab.substring(5).trim();
    }
    if (newCollab.toLowerCase().endsWith(' avec')) {
      newCollab = newCollab.substring(0, newCollab.length - 5).trim();
    }
    if (!ignoredWords.includes(newCollab.toLowerCase()) && newCollab.length > 0) {
      // Définir le filtre de collaborateur
      filters.collab = filterCollab;
      // Définir la nouvelle valeur
      updateData.newCollab = newCollab;
      console.log(
        '[Parse Query API] ✅ Pattern "collab avec X à Y" détecté:',
        `filtre=${filterCollab}, nouvelle valeur=${newCollab}`
      );
    }
  } else {
    // Patterns: "en mettant en collaborateur X", "en collaborateur X", "avec collaborateur X", "collab X"
    // Pattern amélioré pour "met les projets en collab avec X"
    const newCollabPatterns = [
      /(?:en\s+)?mettant\s+(?:en\s+)?(?:collaborateur|collab)\s+([A-Za-z0-9_\s]+)/i,
      /(?:en|avec)\s+(?:collaborateur|collab)\s+([A-Za-z0-9_\s]+)/i,
      /(?:mets?|met|change|changer|modifie|modifier|passe|passer)\s+(?:les?\s+)?(?:projets?\s+)?(?:en|à|avec)\s+(?:collaborateur|collab)\s+(?:avec\s+)?([A-Za-z0-9_\s]+?)(?:\s|$)/i,
    ];

    for (const pattern of newCollabPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        let collabName = match[1].trim();
        // Ignorer les mots-clés communs
        const ignoredWords = ['projets', 'projet', 'les', 'mes', 'de', 'en', 'le', 'la', 'avec'];
        // Si le nom commence par "avec ", l'enlever
        if (collabName.toLowerCase().startsWith('avec ')) {
          collabName = collabName.substring(5).trim();
        }
        // Si le nom se termine par " avec", l'enlever aussi
        if (collabName.toLowerCase().endsWith(' avec')) {
          collabName = collabName.substring(0, collabName.length - 5).trim();
        }
        if (!ignoredWords.includes(collabName.toLowerCase()) && collabName.length > 0) {
          updateData.newCollab = collabName;
          console.log('[Parse Query API] ✅ Nouveau collaborateur détecté:', collabName);
          break;
        }
      }
    }

    // Si on n'a pas trouvé de nouvelle valeur, chercher "à X" après "collab avec Y"
    if (updateData.newCollab === undefined) {
      const collabWithPattern = /(?:en\s+)?(?:collab|collaborateur)\s+avec\s+([A-Za-z0-9_\s]+)/i;
      const collabWithMatch = query.match(collabWithPattern);
      if (collabWithMatch) {
        const filterCollab = collabWithMatch[1].trim();
        filters.collab = filterCollab;
        // Chercher "à X" après
        const aPattern =
          /(?:en\s+)?(?:collab|collaborateur)\s+avec\s+[A-Za-z0-9_\s]+\s+à\s+([A-Za-z0-9_\s]+)/i;
        const aMatch = query.match(aPattern);
        if (aMatch && aMatch[1]) {
          let newCollab = aMatch[1].trim();
          const ignoredWords = ['projets', 'projet', 'les', 'mes', 'de', 'en', 'le', 'la', 'avec'];
          if (!ignoredWords.includes(newCollab.toLowerCase())) {
            updateData.newCollab = newCollab;
            console.log(
              '[Parse Query API] ✅ Pattern "collab avec X à Y" détecté (en deux étapes):',
              `filtre=${filterCollab}, nouvelle valeur=${newCollab}`
            );
          }
        }
      }
    }
  }

  // Extraire le nouveau style
  // D'abord, détecter le pattern spécial "de style X à Y" (filtre X, nouvelle valeur Y)
  const styleFilterToNewPattern =
    /(?:de|depuis)\s+style\s+([A-Za-z0-9_\s]+)\s+à\s+([A-Za-z0-9_\s]+)/i;
  const styleFilterToNewMatch = query.match(styleFilterToNewPattern);
  if (styleFilterToNewMatch) {
    const filterStyle = styleFilterToNewMatch[1].trim();
    const newStyle = styleFilterToNewMatch[2].trim();
    // Définir le filtre de style
    filters.style = filterStyle;
    // Définir la nouvelle valeur
    const styleMatch = findStyleFromString(newStyle, availableStyles);
    if (styleMatch) {
      updateData.newStyle = styleMatch.style;
    } else {
      updateData.newStyle = newStyle;
    }
    console.log(
      '[Parse Query API] ✅ Pattern "de style X à Y" détecté:',
      `filtre=${filterStyle}, nouvelle valeur=${newStyle}`
    );
  } else {
    // Patterns: "en style X", "change le style à X", "passe en style X", "style X", "en Dnb"
    const newStylePatterns = [
      /(?:en|à)\s+style\s+([A-Za-z0-9_\s]+)/i,
      /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:les?\s+)?(?:projets?\s+)?(?:le\s+)?style\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
      /style\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
      // Pattern pour "met les projets en Dnb" (sans le mot "style")
      /(?:mets?|met|change|changer|modifie|modifier|passe|passer)\s+(?:les?\s+)?(?:projets?\s+)?en\s+([A-Za-z0-9_\s]+)(?:\s|$)/i,
    ];

    for (const pattern of newStylePatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const styleName = match[1].trim();
        // Ignorer les mots-clés communs
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
        if (ignoredWords.includes(styleName.toLowerCase())) {
          continue;
        }
        // Vérifier si c'est un style valide
        const styleMatch = findStyleFromString(styleName, availableStyles);
        if (styleMatch) {
          updateData.newStyle = styleMatch.style;
          console.log('[Parse Query API] ✅ Nouveau style détecté:', styleMatch.style);
          break;
        } else {
          // Si pas trouvé dans la liste, utiliser quand même (peut être un nouveau style)
          updateData.newStyle = styleName;
          console.log('[Parse Query API] ✅ Nouveau style détecté (non validé):', styleName);
          break;
        }
      }
    }
  }

  // Extraire le nouveau label (label ciblé)
  // Patterns: "label à X", "change le label à X", "label ciblé X"
  const newLabelPatterns = [
    /(?:label|label\s+cibl[ée])\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+cibl[ée]\s+(?:à|en|pour)?\s*([A-Za-z0-9_\s]+)/i,
  ];

  for (const pattern of newLabelPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const labelName = match[1].trim();
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
      if (!ignoredWords.includes(labelName.toLowerCase())) {
        updateData.newLabel = labelName;
        console.log('[Parse Query API] ✅ Nouveau label détecté:', labelName);
        break;
      }
    }
  }

  // Extraire le nouveau label final (si signé)
  // Patterns: "label final à X", "signé chez X", "label final X"
  const newLabelFinalPatterns = [
    /(?:label\s+final|sign[ée])\s+(?:à|en|chez|pour)\s+([A-Za-z0-9_\s]+)/i,
    /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+final\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
    /sign[ée]\s+chez\s+([A-Za-z0-9_\s]+)/i,
  ];

  for (const pattern of newLabelFinalPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const labelFinalName = match[1].trim();
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
        'final',
      ];
      if (!ignoredWords.includes(labelFinalName.toLowerCase())) {
        updateData.newLabelFinal = labelFinalName;
        console.log('[Parse Query API] ✅ Nouveau label final détecté:', labelFinalName);
        break;
      }
    }
  }

  // Si on a au moins une modification à faire, c'est une commande de modification valide
  if (
    updateData.newProgress !== undefined ||
    updateData.newStatus !== undefined ||
    updateData.newDeadline !== undefined ||
    updateData.pushDeadlineBy !== undefined ||
    updateData.newCollab !== undefined ||
    updateData.newStyle !== undefined ||
    updateData.newLabel !== undefined ||
    updateData.newLabelFinal !== undefined
  ) {
    console.log('[Parse Query API] updateData final:', updateData);
    return updateData;
  }

  return null;
}
