/**
 * Détection de filtres depuis les requêtes utilisateur
 */
import { findStyleFromString } from '../parsers/style-matcher';

export interface FilterResult {
  filters: Record<string, any>;
  fieldsToShow: string[];
}

/**
 * Détecte tous les filtres depuis une requête
 */
export function detectFilters(
  query: string,
  lowerQuery: string,
  availableCollabs: string[],
  availableStyles: string[]
): FilterResult {
  const filters: Record<string, any> = {};
  const fieldsToShow: string[] = [];

  // Détecter "sans avancement" / "no progress" / "not set"
  if (
    /sans\s*(?:avancement|progression)|pas\s*(?:de\s*)?(?:avancement|progression)|non\s*renseign[ée]|no\s*(?:progress|percentage|percent)|not\s*set|null|vide/i.test(
      lowerQuery
    )
  ) {
    filters.noProgress = true;
    console.log('[Parse Query API] Filtre noProgress détecté pour:', query);
  }

  // Détecter demande de champs spécifiques à afficher

  // "Tout" / "Détails" / "Infos" -> on affiche tout
  if (/tou(?:tes?|s)|infos?|détails?|all|everything|complet/i.test(lowerQuery)) {
    fieldsToShow.push('status', 'progress', 'collab', 'releaseDate', 'deadline', 'style');
  } else {
    // Champs individuels seulement si on n'a pas demandé "tout"
    // Date de sortie
    if (/date|sortie|release|quand|when/i.test(lowerQuery) && !/deadline/i.test(lowerQuery)) {
      fieldsToShow.push('releaseDate');
    }
    // Deadline
    if (/deadline|date\s*limite|due/i.test(lowerQuery)) {
      fieldsToShow.push('deadline');
    }
    // Avancement / Progression
    if (/avancement|progress|%|pourcent|niveau/i.test(lowerQuery)) {
      fieldsToShow.push('progress');
    }
    // Statut
    if (/statut|status|[ée]tat|state/i.test(lowerQuery)) {
      fieldsToShow.push('status');
    }
    // Collaborateur
    if (/collab|avec\s*qui|feat|partenaire/i.test(lowerQuery)) {
      fieldsToShow.push('collab');
    }
    // Style
    if (/style|genre/i.test(lowerQuery)) {
      fieldsToShow.push('style');
    }
  }

  // Détecter "à X% d'avancement" ou "à X%" comme filtre exact (min = max = X)
  // Patterns: "projets à 7%", "à 7% d'avancement", "modifie les projets à 7% et mets les à 10"
  // Note: "a" (sans accent) est aussi accepté pour tolérer les fautes de frappe
  const exactProgressPatterns = [
    /(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%\s*(?:d['']?avancement|de\s+progress|de\s+progression)/i,
    // "projets à 7%" suivi de "et", "," (avec ou sans espace), ou fin de phrase
    // Accepte aussi "tous les projets a 15%," avec "tous les" avant
    /(?:tous\s+les?\s+)?(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%(?:\s*(?:et|,)|$)/i,
    // "des projets à 15%" - pattern pour "des projets à X%"
    /(?:des?\s+)?(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%/i,
    // "modifie les projets à 7% et" - pattern spécifique pour ce cas
    /(?:modifie|modifier|change|changer|mets?|met|passe|passer)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%\s*(?:et|,)/i,
  ];

  for (let i = 0; i < exactProgressPatterns.length; i++) {
    const pattern = exactProgressPatterns[i];
    const exactMatch = query.match(pattern);
    console.log(`[Parse Query API] 🔍 Test pattern ${i + 1}:`, pattern, '→ match:', exactMatch);
    if (exactMatch) {
      const exactValue = parseInt(exactMatch[1], 10);
      if (!isNaN(exactValue) && exactValue >= 0 && exactValue <= 100) {
        const matchIndex = exactMatch.index || 0;
        const matchedText = exactMatch[0];
        const textAfter = query
          .substring(matchIndex + matchedText.length)
          .toLowerCase()
          .trim();

        // Vérifier si le match se termine par "et" (le pattern l'a inclus, c'est un filtre)
        const matchEndsWithEt =
          /\s+(?:et|,)\s*$/i.test(matchedText) ||
          matchedText.trim().endsWith('et') ||
          matchedText.trim().endsWith(',');

        // Si c'est suivi de "et" puis d'un verbe, c'est un filtre (ex: "à 7% et mets")
        // Si c'est suivi directement d'un verbe sans "et", c'est probablement une nouvelle valeur
        const isFollowedByUpdateVerbDirectly =
          /^(?:mets?|met|passe|passer|change|changer|modifie|modifier)/i.test(textAfter);

        // Si c'est suivi de "et", c'est un filtre
        const isFollowedByEt = /^\s*et/i.test(textAfter);

        // Si c'est suivi d'une date/deadline (ex: "au mois prochain", "demain"), c'est un filtre
        // car "à 15% au mois prochain" signifie "les projets à 15%"
        const isFollowedByDate =
          /\b(?:au|à\s+le|pour|pour\s+le)\s+(?:le\s+)?(?:mois\s+prochain|semaine\s+pro|semaine\s+prochaine|next\s+month|next\s+week|demain|tomorrow|aujourd['']hui|today)/i.test(
            textAfter
          );

        console.log(`[Parse Query API] 🔍 Pattern ${i + 1} matché:`, {
          value: exactValue,
          matchedText,
          textAfter,
          matchEndsWithEt,
          isFollowedByEt,
          isFollowedByUpdateVerbDirectly,
          isFollowedByDate,
          willUse:
            matchEndsWithEt ||
            isFollowedByEt ||
            isFollowedByDate ||
            !isFollowedByUpdateVerbDirectly,
        });

        // Si le match se termine par "et" ou est suivi de "et", d'une date, ou pas d'un verbe de modification, c'est un filtre
        if (
          matchEndsWithEt ||
          isFollowedByEt ||
          isFollowedByDate ||
          !isFollowedByUpdateVerbDirectly
        ) {
          filters.minProgress = exactValue;
          filters.maxProgress = exactValue;
          console.log('[Parse Query API] ✅ Filtre progression exacte détecté:', exactValue);
          break;
        }
      }
    }
  }

  // Détecter progression max (sous les X%, under X%, less than X%)
  const maxPatterns = [
    /(?:sous\s*(?:les?)?|moins\s*de|inf[ée]rieur[es]?\s*[àa]|<)\s*(\d+)\s*(?:%|pourcent)?/i,
    /(?:under|below|less\s*than)\s*(\d+)\s*%?/i,
    /(\d+)\s*(?:%|pourcent)\s*(?:max|maximum)/i,
  ];
  for (const pattern of maxPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      filters.maxProgress = parseInt(match[1], 10);
      break;
    }
  }

  // Détecter progression min (plus de X%, supérieur à X%, > X%)
  const minPatternsCorrect = [
    /(?:plus\s*de|sup[ée]rieur[es]?\s*[àa]|>|au\s*dessus\s*de)\s*(\d+)\s*(?:%|pourcent)?/i,
    /(\d+)\s*(?:%|pourcent)\s*(?:min|minimum)/i,
  ];

  for (const pattern of minPatternsCorrect) {
    const match = lowerQuery.match(pattern);
    if (match) {
      filters.minProgress = parseInt(match[1], 10);
      break;
    }
  }

  // Détecter "entre X et Y%"
  const entreMatch = lowerQuery.match(/entre\s*(\d+)\s*(?:et|à)\s*(\d+)\s*%?/i);
  if (entreMatch) {
    filters.minProgress = parseInt(entreMatch[1], 10);
    filters.maxProgress = parseInt(entreMatch[2], 10);
  }

  // Détecter statuts avec variations FR + EN
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

  for (const { pattern, status } of statusPatterns) {
    if (pattern.test(lowerQuery)) {
      filters.status = status;
      break;
    }
  }

  // Détecter collaborateurs
  const collabPatterns = [
    /collab(?:oration)?s?\s+(?:avec\s+)?([A-Za-z0-9_]+)/i, // "collab avec X" ou "collab X"
    /(?:avec|feat\.?|ft\.?)\s+([A-Za-z0-9_]+)/i, // "avec X", "feat X"
    /([A-Za-z0-9_]+)\s+collab/i, // "X collab"
  ];
  for (const pattern of collabPatterns) {
    const match = query.match(pattern); // Garder la casse originale
    if (match && match[1]) {
      const collabName = match[1].trim();
      // Vérifier si c'est un vrai collab (pas un mot clé)
      const ignoredWords = [
        'projets',
        'projet',
        'les',
        'mes',
        'de',
        'en',
        'le',
        'la',
        'avec',
        'quelles',
        'quels',
        'ai',
        'j',
      ];
      if (!ignoredWords.includes(collabName.toLowerCase())) {
        // Chercher le collab le plus proche dans la liste
        const matchedCollab = availableCollabs.find(
          (c) =>
            c.toLowerCase().includes(collabName.toLowerCase()) ||
            collabName.toLowerCase().includes(c.toLowerCase())
        );
        filters.collab = matchedCollab || collabName;
        break;
      }
    }
  }

  // Détecter styles avec variations et alias
  const styleMatch = findStyleFromString(query, availableStyles);
  if (styleMatch) {
    filters.style = styleMatch.style;
  }

  // Détecter label (label ciblé)
  const labelPatterns = [
    /(?:label|label\s+cibl[ée])\s+(?:à|en|pour|est|de)?\s*([A-Za-z0-9_\s]+)/i,
    /(?:projets?\s+)?(?:avec\s+)?label\s+([A-Za-z0-9_\s]+)/i,
  ];
  for (const pattern of labelPatterns) {
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
        'est',
      ];
      if (!ignoredWords.includes(labelName.toLowerCase()) && labelName.length > 1) {
        filters.label = labelName;
        break;
      }
    }
  }

  // Détecter label final (si signé)
  const labelFinalPatterns = [
    /(?:label\s+final|sign[ée])\s+(?:à|en|chez|pour|est|de)?\s*([A-Za-z0-9_\s]+)/i,
    /(?:projets?\s+)?(?:avec\s+)?label\s+final\s+([A-Za-z0-9_\s]+)/i,
    /sign[ée]\s+chez\s+([A-Za-z0-9_\s]+)/i,
  ];
  for (const pattern of labelFinalPatterns) {
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
      if (!ignoredWords.includes(labelFinalName.toLowerCase()) && labelFinalName.length > 1) {
        filters.labelFinal = labelFinalName;
        break;
      }
    }
  }

  // Détecter deadline
  if (/avec\s*deadline|deadline\s*pr[ée]vue/i.test(lowerQuery)) {
    filters.hasDeadline = true;
  } else if (/sans\s*deadline|pas\s*de\s*deadline/i.test(lowerQuery)) {
    filters.hasDeadline = false;
  }

  return { filters, fieldsToShow };
}
