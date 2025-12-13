/**
 * Détection de filtres depuis les requêtes utilisateur
 */
import { findStyleFromString } from '../parsers/style-matcher';

/**
 * Helper pour les logs de debug (patterns matching)
 * Active uniquement si ASSISTANT_DEBUG_PATTERNS=true dans les variables d'environnement
 */
const isDebugPatterns = () => process.env.ASSISTANT_DEBUG_PATTERNS === 'true';

const debugLog = (...args: any[]) => {
  if (isDebugPatterns()) {
    console.log(...args);
  }
};

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
    debugLog(`[Parse Query API] 🔍 Test pattern ${i + 1}:`, pattern, '→ match:', exactMatch);
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

        debugLog(`[Parse Query API] 🔍 Pattern ${i + 1} matché:`, {
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
  // IMPORTANT: Ne pas détecter un statut comme filtre si c'est une commande de mise à jour
  // et que le statut apparaît après "à" ou "en" (c'est la nouvelle valeur, pas un filtre)
  // Exemple: "passe les à en cours" -> "en cours" est la nouvelle valeur, pas un filtre
  // IMPORTANT: Ne pas détecter un statut comme filtre s'il fait partie d'un pattern "de X à Y"
  // Exemple: "passe les projets de EN_COURS à TERMINE" -> "TERMINE" est la nouvelle valeur, pas un filtre
  const isUpdateCommand =
    /(?:passe|met|mets?|change|changer|modifie|modifier|marque|marquer)\s+(?:les?\s+)(?:projets?\s+)?(?:à|en|comme)/i.test(
      query
    );
  const hasDeXaYPattern =
    /(?:passe|met|mets?|change|changer|modifie|modifier|marque|marquer)\s+(?:les?\s+)?(?:projets?\s+)?de\s+(?:en\s*cours|termin[ée]s?|annul[ée]s?|ghost\s*prod|archiv[ée]s?)\s+à\s+(?:en\s*cours|termin[ée]s?|annul[ée]s?|ghost\s*prod|archiv[ée]s?)/i.test(
      query
    );

  const statusPatterns: { pattern: RegExp; status: string }[] = [
    // GHOST_PRODUCTION - Tolérer les fautes d'orthographe courantes
    {
      pattern: /ghost\s*prod(?:uction)?|ghostprod|gost\s*prod|ghosprod|gausprod|goastprod/i,
      status: 'GHOST_PRODUCTION',
    },
    {
      pattern: /termin[ée]s?|finis?|complet[ée]?s?|finished|completed|done|100\s*%|TERMINE/i,
      status: 'TERMINE',
    },
    { pattern: /annul[ée]s?|cancel(?:led)?|abandonn[ée]s?|dropped/i, status: 'ANNULE' },
    {
      // EN_COURS - Tolérer "encours", "en courrs" (double r) mais pas "en cour" (trop ambigu)
      pattern:
        /en\s*cours|en\s*courrs|encours|ongoing|actifs?|in\s*(?:progress|the\s*works)|current|active|wip|EN\s*COURS|EN_COURS/i,
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
      // Si c'est un pattern "de X à Y", ne pas détecter les statuts comme filtres
      // car ils font partie du pattern et seront gérés par extractUpdateData
      if (hasDeXaYPattern) {
        console.log(
          '[Parse Query API] ⚠️ Statut détecté mais ignoré (pattern "de X à Y"):',
          status,
          'dans:',
          query
        );
        continue;
      }

      // Si c'est une commande de mise à jour, vérifier que le statut n'est pas après "à" ou "en"
      // (car dans ce cas, c'est la nouvelle valeur, pas un filtre)
      if (isUpdateCommand) {
        // Chercher où le statut apparaît dans la requête
        const match = lowerQuery.match(pattern);
        if (match && match.index !== undefined) {
          const statusIndex = match.index;
          const textBeforeStatus = lowerQuery.substring(0, statusIndex).trim();
          // Si le statut est précédé de "à", "en" ou "comme" (nouvelle valeur), ne pas l'utiliser comme filtre
          // Exemple: "passe les à en cours" -> "en cours" est après "à", donc c'est la nouvelle valeur
          // Exemple: "marques les projets en TERMINE" -> "TERMINE" est après "en", donc c'est la nouvelle valeur
          // Le pattern cherche "à", "en" ou "comme" suivi de zéro ou plus espaces à la fin du texte avant le statut
          // On cherche aussi directement "à en" ou "à en cours" pour être plus précis
          // IMPORTANT: Pour "en TERMINE", on doit vérifier que "en" est bien présent avant le statut
          const endsWithAorEn = /(?:^|\s)(?:à|en|comme|as)\s*$/.test(textBeforeStatus);
          const hasAEnPattern = /\s+à\s+(?:en|comme|as)\s*$/.test(textBeforeStatus);
          // Vérifier aussi si le statut est directement après "en" (ex: "en TERMINE", "en cours")
          const hasEnBeforeStatus = /\ben\s+$/.test(textBeforeStatus);
          if (endsWithAorEn || hasAEnPattern || hasEnBeforeStatus) {
            // C'est la nouvelle valeur, pas un filtre - continuer à chercher d'autres statuts
            console.log(
              '[Parse Query API] ⚠️ Statut détecté mais ignoré (nouvelle valeur):',
              status,
              'dans:',
              query,
              'textBeforeStatus:',
              textBeforeStatus
            );
            continue;
          }
        }
      }
      filters.status = status;
      console.log('[Parse Query API] ✅ Statut détecté comme filtre:', status, 'dans:', query);
      break;
    }
  }

  // Détecter collaborateurs
  const collabPatterns = [
    /collab(?:oration)?s?\s+(?:avec\s+)?([A-Za-z0-9_]+)/i, // "collab avec X" ou "collab X"
    /(?:avec|feat\.?|ft\.?|with)\s+([A-Za-z0-9_]+)/i, // "avec X", "feat X", "with X"
    /([A-Za-z0-9_]+)\s+collab/i, // "X collab"
    /(?:en\s+)?collaborateur\s+(?:avec\s+)?([A-Za-z0-9_]+)/i, // "en collaborateur avec X" ou "collaborateur X"
  ];
  for (const pattern of collabPatterns) {
    const match = query.match(pattern); // Garder la casse originale
    if (match && match[1]) {
      const collabName = match[1].trim();
      // Vérifier si c'est un vrai collab (pas un mot clé)
      // Ignorer les articles, pronoms possessifs, et mots communs
      const ignoredWords = [
        'projets',
        'projet',
        'les',
        'mes',
        'ma', // possessive adjective (my)
        'mon', // possessive adjective (my)
        'ton', // possessive adjective (your)
        'ta', // possessive adjective (your)
        'tes', // possessive adjective (your)
        'son', // possessive adjective (his/her)
        'sa', // possessive adjective (his/her)
        'ses', // possessive adjective (his/her)
        'notre', // possessive adjective (our)
        'nos', // possessive adjective (our)
        'votre', // possessive adjective (your)
        'vos', // possessive adjective (your)
        'leur', // possessive adjective (their)
        'leurs', // possessive adjective (their)
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
        // Only set filter if we found a match in available collabs
        // This prevents false positives from random words
        // IMPORTANT: Utiliser le nom exact du collab trouvé dans availableCollabs (avec la bonne casse)
        if (matchedCollab) {
          filters.collab = matchedCollab; // Utiliser le nom exact du collab (ex: "TOTO" au lieu de "toto")
          break;
        }
        // If no match found and it's a very short word (1-2 chars), ignore it
        // as it's likely a false positive
        if (collabName.length > 2) {
          // Si pas de match, utiliser le nom tel quel mais essayer de trouver une correspondance proche
          // Chercher un collab qui contient le nom ou vice versa (insensible à la casse)
          const closeMatch = availableCollabs.find(
            (c) => c.toLowerCase() === collabName.toLowerCase()
          );
          filters.collab = closeMatch || collabName;
          break;
        }
      }
    }
  }

  // Détecter styles avec variations et alias
  // IMPORTANT: Ne pas détecter de style si on a déjà détecté un pattern de modification "X en Y"
  // car cela peut créer des faux positifs (ex: "en cours en annulé" ne doit pas être détecté comme style)
  // MAIS: Si on a explicitement "en style X" après le pattern, on doit détecter le style
  const hasStatusUpdatePattern =
    /(?:passe|mets?|met|change|changer|modifie|modifier|marque|marquer)\s+(?:les?\s+)?(?:projets?\s+)?(?:en\s+cours|termin[ée]s?|annul[ée]s?|ghost\s*prod|archiv[ée]s?)\s+en\s+(?:en\s+cours|termin[ée]s?|annul[ée]s?|ghost\s*prod|archiv[ée]s?)/i.test(
      query
    );

  // Ne pas détecter de style si on a "en collaborateur" car "cours" pourrait être confondu avec un style
  // SAUF si on a explicitement "en style X" après
  const hasCollaborateurPattern = /en\s+collaborateur/i.test(query);
  const hasExplicitStylePattern = /en\s+style\s+\w+/i.test(query);

  // Si on a un pattern X en Y mais aussi "en style X" explicite, on doit détecter le style
  if ((!hasStatusUpdatePattern && !hasCollaborateurPattern) || hasExplicitStylePattern) {
    const styleMatch = findStyleFromString(query, availableStyles);
    if (styleMatch) {
      // Vérifier que le style détecté n'est pas un faux positif
      // Si on a "en cours en collaborateur", ne pas détecter "cours" comme style
      // SAUF si on a explicitement "en style cours"
      const styleLower = styleMatch.style.toLowerCase();
      const matchedTextLower = styleMatch.matchedText.toLowerCase();
      // Si le style matché est "cours" ou "en" et qu'on a "en cours" ou "en collaborateur", c'est un faux positif
      // SAUF si on a explicitement "en style cours"
      // AUSSI: Si on a "EN_COURS" (en majuscules), ne pas détecter "cours" comme style
      const hasEnCoursStatus = /en\s*cours|EN_COURS|EN\s*COURS/i.test(query);
      const isFalsePositive =
        !hasExplicitStylePattern &&
        (styleLower === 'cours' || styleLower === 'en') &&
        (hasEnCoursStatus || query.toLowerCase().includes('en collaborateur'));

      if (!isFalsePositive) {
        filters.style = styleMatch.style;
      }
    }
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
