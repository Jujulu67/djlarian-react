/**
 * Détection de filtres depuis les requêtes utilisateur
 */
import { findStyleFromString } from '../parsers/style-matcher';
import { BuildAlternationRegexPart, UpdateVerbs, StatusSynonyms } from './nlp-dictionary';
import { logger } from '@/lib/logger';

/**
 * Helper pour les logs de debug (patterns matching)
 * Active uniquement si ASSISTANT_DEBUG_PATTERNS=true dans les variables d'environnement
 */
const isDebugPatterns = () => process.env.ASSISTANT_DEBUG_PATTERNS === 'true';

const debugLog = (...args: unknown[]) => {
  if (isDebugPatterns()) {
    logger.warn(args[0], ...args.slice(1));
  }
};

export interface FilterResult {
  filters: Record<string, unknown>;
  fieldsToShow: string[];
}

type Filters = Record<string, unknown>;

function detectNoProgress(query: string, lowerQuery: string, filters: Filters): void {
  // Détecter "sans avancement" / "no progress" / "not set"
  if (
    /sans\s*(?:avancement|progression)|pas\s*(?:de\s*)?(?:avancement|progression)|non\s*renseign[ée]|no\s*(?:progress|percentage|percent)|not\s*set|null|vide/i.test(
      lowerQuery
    )
  ) {
    filters.noProgress = true;
    logger.warn('[Parse Query API] Filtre noProgress détecté pour:', query);
  }
}

function detectFieldsToShow(lowerQuery: string): string[] {
  const fieldsToShow: string[] = [];
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
  return fieldsToShow;
}

/** Ce pourcentage désigne-t-il les projets visés (filtre) plutôt que la nouvelle valeur ? */
function isExactProgressFilter(
  query: string,
  exactMatch: RegExpMatchArray,
  patternIndex: number
): boolean {
  const exactValue = Number.parseInt(exactMatch[1], 10);
  const matchIndex = exactMatch.index || 0;
  const matchedText = exactMatch[0];
  const textAfter = query
    .substring(matchIndex + matchedText.length)
    .toLowerCase()
    .trim();

  // Vérifier si le match se termine par "et" (le pattern l'a inclus, c'est un filtre)
  const matchEndsWithEt =
    /(?<!\s)\s+(?:et|,)\s*$/i.test(matchedText) ||
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
    /\b(?:au|à\s+le|pour|pour\s+le)\s+(?:le\s+)?(?:mois\s+prochain|semaine\s+pro|semaine\s+prochaine|next\s+month|next\s+week|demain|tomorrow|aujourd['’]hui|today)/i.test(
      textAfter
    );

  debugLog(`[Parse Query API] 🔍 Pattern ${patternIndex + 1} matché:`, {
    value: exactValue,
    matchedText,
    textAfter,
    matchEndsWithEt,
    isFollowedByEt,
    isFollowedByUpdateVerbDirectly,
    isFollowedByDate,
    willUse:
      matchEndsWithEt || isFollowedByEt || isFollowedByDate || !isFollowedByUpdateVerbDirectly,
  });

  // Vérifier si le match est précédé d'un verbe de modification
  const textBefore = query.substring(0, matchIndex).toLowerCase().trim();

  // Cas 1: C'est explicitement "avancement à X%" -> Toujours une cible, jamais un filtre
  const isExplicitAvancementTarget = /(?:avancement|progression)\s*$/i.test(textBefore);

  // Cas 2: C'est "met les projets à X%" (ambigu)
  // Utiliser le dictionnaire NLP pour les verbes de mise à jour
  const updateVerbsRegex = BuildAlternationRegexPart(UpdateVerbs);
  const isPrecededByUpdateVerb = new RegExp(
    `(?:${updateVerbsRegex})(?:\\s+(?:les?|leur|leurs|projets?))?$`,
    'i'
  ).test(textBefore);

  // Si c'est ambigu, on regarde ce qui suit
  // Si c'est suivi d'un autre paramètre de modif (status, collab, etc), alors le % est un filtre
  // Ex: "met les projets à 50% en TERMINE" -> 50% est un filtre
  // Utiliser les synonymes de statut du dictionnaire
  const statusValues = Object.keys(StatusSynonyms).join('|');
  const isFollowedByUpdateParam = new RegExp(
    `(?:en|à|avec|pour)\\s+(?:${statusValues}|collab|style)`,
    'i'
  ).test(textAfter);

  // On exclut le filtre si :
  // - C'est explicitement "avancement à"
  // - OU c'est une commande de modif qui n'est PAS suivie d'autres paramètres (donc le % est la cible)
  const shouldExcludeAsFilter =
    isExplicitAvancementTarget ||
    (isPrecededByUpdateVerb && !isFollowedByUpdateParam && patternIndex !== 3); // i===3 est le pattern explicite "modifie... à X% et"

  return (
    (matchEndsWithEt || isFollowedByEt || isFollowedByDate || !isFollowedByUpdateVerbDirectly) &&
    !shouldExcludeAsFilter
  );
}

function detectExactProgress(query: string, filters: Filters): void {
  // Détecter "à X% d'avancement" ou "à X%" comme filtre exact (min = max = X)
  // Patterns: "projets à 7%", "à 7% d'avancement", "modifie les projets à 7% et mets les à 10"
  // Note: "a" (sans accent) est aussi accepté pour tolérer les fautes de frappe
  const exactProgressPatterns = [
    /(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%\s*(?:d['’]?avancement|de\s+progress|de\s+progression)/i,
    // "projets à 7%" suivi de "et", "," (avec ou sans espace), ou fin de phrase
    // Accepte aussi "tous les projets a 15%," avec "tous les" avant
    /(?:tous\s+les?\s+)?(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%(?:\s*(?:et|,)|$)/i,
    // "des projets à 15%" - pattern pour "des projets à X%"
    /(?:des?\s+)?(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%/i,
    // "modifie les projets à 7% et" - pattern spécifique pour ce cas
    /(?:modifie|modifier|change|changer|mets?|met|passe|passer)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%\s*(?:et|,)/i,
  ];

  for (let i = 0; i < exactProgressPatterns.length; i++) {
    const exactMatch = query.match(exactProgressPatterns[i]);
    if (!exactMatch) continue;
    const exactValue = Number.parseInt(exactMatch[1], 10);
    if (Number.isNaN(exactValue) || exactValue < 0 || exactValue > 100) continue;
    if (isExactProgressFilter(query, exactMatch, i)) {
      filters.minProgress = exactValue;
      filters.maxProgress = exactValue;
      break;
    }
  }
}

function detectProgressRange(lowerQuery: string, filters: Filters): void {
  // Détecter progression max (sous les X%, under X%, less than X%)
  const maxPatterns = [
    /(?:sous\s*(?:les?)?|moins\s*de|inf[ée]rieur[es]?\s*[àa]|<)\s*(\d+)\s*(?:%|pourcent)?/i,
    /(?:under|below|less\s*than)\s*(\d+)\s*%?/i,
    /(?<!\d)(\d+)\s*(?:%|pourcent)\s*(?:max|maximum)/i,
  ];
  for (const pattern of maxPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      filters.maxProgress = Number.parseInt(match[1], 10);
      break;
    }
  }

  // Détecter progression min (plus de X%, supérieur à X%, > X%)
  const minPatternsCorrect = [
    /(?:plus\s*de|sup[ée]rieur[es]?\s*[àa]|>|au\s*dessus\s*de)\s*(\d+)\s*(?:%|pourcent)?/i,
    /(?<!\d)(\d+)\s*(?:%|pourcent)\s*(?:min|minimum)/i,
  ];

  for (const pattern of minPatternsCorrect) {
    const match = lowerQuery.match(pattern);
    if (match) {
      filters.minProgress = Number.parseInt(match[1], 10);
      break;
    }
  }

  // Détecter "entre X et Y%"
  const entreMatch = lowerQuery.match(/entre\s*(\d+)\s*(?:et|à)\s*(\d+)\s*%?/i);
  if (entreMatch) {
    filters.minProgress = Number.parseInt(entreMatch[1], 10);
    filters.maxProgress = Number.parseInt(entreMatch[2], 10);
  }
}

const STATUS_PATTERNS: { pattern: RegExp; status: string }[] = [
  // GHOST_PRODUCTION - Très tolérant aux fautes d'orthographe
  {
    pattern:
      /ghost\s*prod(?:uction)?|ghostprod|gost\s*prod|ghosprod|gausprod|goastprod|ghosp\s*rod|goes\s*prod|gosht\s*prod|gostprod|goshtprod|ghosst\s*prod|ghots\s*prod|ghostproduction|ghost-prod|ghost-production|góstprod|gauspraud|gausteprauds|gausotprod/i,
    status: 'GHOST_PRODUCTION',
  },
  // TERMINE - Tolérant aux fautes
  {
    pattern:
      /termin[ée]s?|finis?|complet[ée]?s?|finished|completed|done|100\s*%|TERMINE|treminer|terminer|termi|termne|terminne|teminé|terniné|temriné|finit|finnis|achev[ée]s?/i,
    status: 'TERMINE',
  },
  // ANNULE - Tolérant aux fautes
  {
    pattern:
      /annul[ée]s?|cancel(?:led)?|abandonn[ée]s?|dropped|annler|anul[ée]?|annuler|annull[ée]|anull[ée]|anuler/i,
    status: 'ANNULE',
  },
  {
    // EN_COURS - Tolérer "encours", "en courrs" (double r), "ancours", etc.
    pattern:
      /en\s*cours|en\s*courrs|encours|ancours|emcours|en\s*coures|n\s*cours|en\s*cous|encour|en\s*crs|encoours|ongoing|actifs?|in\s*(?:progress|the\s*works)|current|active|wip|work\s*in\s*progress|EN\s*COURS|EN_COURS/i,
    status: 'EN_COURS',
  },
  {
    pattern: /en\s*attente|pending|waiting|on\s*hold|pause|EN\s*ATTENTE|EN_ATTENTE/i,
    status: 'EN_ATTENTE',
  },
  // ARCHIVE - Tolérant aux fautes
  {
    pattern: /archiv[ée]s?|archived|arkiv[ée]?|arkive|archiver|arch(?!ive)|archve|arciv[ée]/i,
    status: 'ARCHIVE',
  },
  // A_REWORK - Tolérant aux fautes
  {
    pattern:
      /rework|[àa]\s*rework|[àa]\s*refaire|retravailler|needs?\s*work|needs?\s*rework|rwork|re\s*work|reword|rewok/i,
    status: 'A_REWORK',
  },
];

/** Statut précisé dans un filtre explicite (« pour les terminés »), même dans une commande. */
function detectExplicitStatus(query: string, lowerQuery: string, filters: Filters): void {
  // Détecter d'abord les patterns explicites "pour les [statut]", "sur les [statut]", etc.
  // Ces patterns sont toujours des filtres, même dans les commandes UPDATE
  const explicitFilterPatterns = [
    /(?:pour|sur|des?)\s+(?:les?\s+)?(?:projets?\s+)?(termin[ée]s?|en\s*cours|annul[ée]s?|archiv[ée]s?|ghost\s*prod)/i,
    /(?:les?\s+)?(termin[ée]s?|en\s*cours|annul[ée]s?|archiv[ée]s?|ghost\s*prod)\s+(?:pour|sur)/i,
  ];

  for (const explicitPattern of explicitFilterPatterns) {
    const explicitMatch = lowerQuery.match(explicitPattern);
    if (explicitMatch) {
      const statusText = explicitMatch[1]?.toLowerCase().trim();
      if (statusText) {
        // Mapper le texte au statut correspondant
        const statusMapping: Record<string, string> = {
          terminé: 'TERMINE',
          terminés: 'TERMINE',
          terminées: 'TERMINE',
          termine: 'TERMINE',
          'en cours': 'EN_COURS',
          encours: 'EN_COURS',
          annulé: 'ANNULE',
          annulés: 'ANNULE',
          annulées: 'ANNULE',
          annule: 'ANNULE',
          archivé: 'ARCHIVE',
          archivés: 'ARCHIVE',
          archivées: 'ARCHIVE',
          archive: 'ARCHIVE',
          'ghost prod': 'GHOST_PRODUCTION',
          'ghost production': 'GHOST_PRODUCTION',
          ghostprod: 'GHOST_PRODUCTION',
        };
        const mappedStatus = statusMapping[statusText];
        if (mappedStatus) {
          filters.status = mappedStatus;
          logger.warn(
            '[Parse Query API] ✅ Statut détecté comme filtre explicite (pattern "pour/sur"):',
            mappedStatus,
            'dans:',
            query
          );
          // Ne pas continuer la boucle, on a trouvé le filtre
          break;
        }
      }
    }
  }
}

/** Le statut suit « à », « en » ou « comme » : c'est la nouvelle valeur, pas un filtre. */
function isNewStatusValue(lowerQuery: string, pattern: RegExp): boolean {
  const match = lowerQuery.match(pattern);
  if (!match || match.index === undefined) return false;
  const statusIndex = match.index;
  const textBeforeStatus = lowerQuery.substring(0, statusIndex).trim();
  // Si le statut est précédé de "à", "en" ou "comme" (nouvelle valeur), ne pas l'utiliser comme filtre
  // Exemple: "passe les à en cours" -> "en cours" est après "à", donc c'est la nouvelle valeur
  // Exemple: "marques les projets en TERMINE" -> "TERMINE" est après "en", donc c'est la nouvelle valeur
  const endsWithAorEn = /(?:^|\s)(?:à|en|comme|as)\s*$/.test(textBeforeStatus);
  const hasAEnPattern = /(?<!\s)\s+à\s+(?:en|comme|as)\s*$/.test(textBeforeStatus);
  // Vérifier aussi si le statut est directement après "en" (ex: "en TERMINE", "en cours")
  const hasEnBeforeStatus = /\ben\s+$/.test(textBeforeStatus);

  return endsWithAorEn || hasAEnPattern || hasEnBeforeStatus;
}

function detectStatus(query: string, lowerQuery: string, filters: Filters): void {
  // Détecter statuts avec variations FR + EN
  // IMPORTANT: Ne pas détecter un statut comme filtre si c'est une commande de mise à jour
  // et que le statut apparaît après "à" ou "en" (c'est la nouvelle valeur, pas un filtre)
  // Exemple: "passe les à en cours" -> "en cours" est la nouvelle valeur, pas un filtre
  // IMPORTANT: Ne pas détecter un statut comme filtre s'il fait partie d'un pattern "de X à Y"
  // Exemple: "passe les projets de EN_COURS à TERMINE" -> "TERMINE" est la nouvelle valeur, pas un filtre
  // IMPORTANT: Détecter aussi les commandes UPDATE avec un statut entre le verbe et "à" (ex: "passe les terminés à 20%")
  const isUpdateCommand =
    /(?:passe|met|mets?|change|changer|modifie|modifier|marque|marquer)\s+(?:les?\s+)?(?:projets?\s+)?(?:.*?\s+)?(?:à|en|comme)/i.test(
      query
    );
  const hasDeXaYPattern =
    /(?:passe|met|mets?|change|changer|modifie|modifier|marque|marquer)\s+(?:les?\s+)?(?:projets?\s+)?de\s+(?:en\s*cours|termin[ée]s?|annul[ée]s?|ghost\s*prod|archiv[ée]s?)\s+à\s+(?:en\s*cours|termin[ée]s?|annul[ée]s?|ghost\s*prod|archiv[ée]s?)/i.test(
      query
    );

  detectExplicitStatus(query, lowerQuery, filters);
  // « de X à Y » : les statuts sont gérés par extractUpdateData
  if (filters.status || hasDeXaYPattern) return;

  for (const { pattern, status } of STATUS_PATTERNS) {
    if (!pattern.test(lowerQuery)) continue;
    if (isUpdateCommand && isNewStatusValue(lowerQuery, pattern)) continue;
    filters.status = status;
    break;
  }
}

const COLLAB_IGNORED_WORDS = [
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
  'par',
  'pour',
  'change',
  'met',
  'mets',
  'passe',
  'modifie',
  'modifier',
  'affiche',
  'donne',
  'montre',
  'cahnge',
  'chnage',
  'chang',
  'pase',
  'pass',
  'modifi',
];

/** Nom exact du collaborateur connu, ou le mot lui-même s'il n'est ni un mot clé ni trop court. */
function resolveCollab(collabName: string, availableCollabs: string[]): string | null {
  const lowerName = collabName.toLowerCase();
  if (COLLAB_IGNORED_WORDS.includes(lowerName)) return null;
  const known = availableCollabs.find(
    (c) => c.toLowerCase().includes(lowerName) || lowerName.includes(c.toLowerCase())
  );
  if (known) return known;
  // Un mot de 1 ou 2 lettres est très probablement un faux positif
  return collabName.length > 2 ? collabName : null;
}

function detectCollab(query: string, filters: Filters, availableCollabs: string[]): void {
  const collabPatterns = [
    /collab(?:oration)?s?\s+(?:avec\s+)?(\w+)/i, // "collab avec X" ou "collab X"
    /(?:avec|feat\.?|ft\.?|with)\s+(\w+)/i, // "avec X", "feat X", "with X"
    /\b(\w+)\s+collab/i, // "X collab"
    /(?:en\s+)?collaborateur\s+(?:avec\s+)?(\w+)/i, // "en collaborateur avec X" ou "collaborateur X"
  ];
  for (const pattern of collabPatterns) {
    // Garder la casse originale
    const collabName = query.match(pattern)?.[1]?.trim();
    const collab = collabName ? resolveCollab(collabName, availableCollabs) : null;
    if (collab) {
      filters.collab = collab;
      break;
    }
  }
}

/** « cours » dans « en cours », ou « Progressive » reconnu dans « progression ». */
function isStyleFalsePositive(
  query: string,
  styleMatch: NonNullable<ReturnType<typeof findStyleFromString>>,
  hasExplicitStylePattern: boolean
): boolean {
  const styleLower = styleMatch.style.toLowerCase();
  // Si le style matché est "cours" ou "en" et qu'on a "en cours" ou "en collaborateur", c'est un faux positif
  // SAUF si on a explicitement "en style cours"
  // AUSSI: Si on a "EN_COURS" (en majuscules), ne pas détecter "cours" comme style
  const hasEnCoursStatus = /en\s*cours|EN_COURS|EN\s*COURS/i.test(query);
  const isFalsePositive =
    !hasExplicitStylePattern &&
    (styleLower === 'cours' || styleLower === 'en') &&
    (hasEnCoursStatus || query.toLowerCase().includes('en collaborateur'));

  // Vérifier aussi si c'est un faux positif lié à "progression" → "Progressive"
  const queryLower = query.toLowerCase();
  const hasProgressionKeywords =
    queryLower.includes('progression') ||
    queryLower.includes('avancement') ||
    (queryLower.includes('progress') && !queryLower.includes('progressive'));
  const hasExplicitStyleKeyword = queryLower.includes('style');

  // Si on a matché "Progressive" mais que la requête contient "progression" sans "style",
  // c'est un faux positif (car "progression" contient "prog" qui est une variation de "Progressive")
  // Simplification: si on a "Progressive" + mots de progression sans "style", c'est toujours un faux positif
  const isProgressionFalsePositive =
    styleMatch.style === 'Progressive' && hasProgressionKeywords && !hasExplicitStyleKeyword;

  return isFalsePositive || isProgressionFalsePositive;
}

function detectStyle(query: string, filters: Filters, availableStyles: string[]): void {
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
    if (styleMatch && !isStyleFalsePositive(query, styleMatch, hasExplicitStylePattern)) {
      filters.style = styleMatch.style;
    }
  }
}

function detectLabel(query: string, filters: Filters): void {
  // Détecter label (label ciblé)
  const labelPatterns = [
    /(?:label|label\s+cibl[ée])\s+(?:à|en|pour|est|de)?\s*([a-z0-9_\s]+)/i,
    /(?:projets?\s+)?(?:avec\s+)?label\s+([a-z0-9_\s]+)/i,
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
}

function detectLabelFinal(query: string, filters: Filters): void {
  // Détecter label final (si signé)
  const labelFinalPatterns = [
    /(?:label\s+final|sign[ée])\s+(?:à|en|chez|pour|est|de)?\s*([a-z0-9_\s]+)/i,
    /(?:projets?\s+)?(?:avec\s+)?label\s+final\s+([a-z0-9_\s]+)/i,
    /sign[ée]\s+chez\s+([a-z0-9_\s]+)/i,
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
}

function detectDeadline(query: string, lowerQuery: string, filters: Filters): void {
  // Détecter deadline
  // Patterns: "avec deadline", "deadline prévue", "pour les projets avec deadline", "qui ont une deadline", "qui ont deadline"
  const hasDeadlinePatterns = [
    /(?:pour|sur|des?)\s+(?:les?\s+)?(?:projets?\s+)?(?:avec|qui\s+ont\s+(?:une\s+)?|ayant\s+une?\s+)deadline/i,
    /avec\s*deadline|deadline\s*pr[ée]vue|qui\s+ont\s+(?:une\s+)?deadline|ayant\s+une?\s+deadline/i,
  ];
  const hasNoDeadlinePatterns = [
    /(?:pour|sur|des?)\s+(?:les?\s+)?(?:projets?\s+)?(?:sans|qui\s+n['’]ont\s+pas\s+de|n['’]ayant\s+pas\s+de)\s+deadline/i,
    /sans\s*deadline|pas\s*de\s*deadline|qui\s+n['’]ont\s+pas\s+de\s+deadline/i,
  ];

  let hasDeadlineDetected = false;
  for (const pattern of hasDeadlinePatterns) {
    if (pattern.test(lowerQuery)) {
      filters.hasDeadline = true;
      hasDeadlineDetected = true;
      logger.warn('[Parse Query API] ✅ Filtre hasDeadline=true détecté:', query);
      break;
    }
  }

  if (!hasDeadlineDetected) {
    for (const pattern of hasNoDeadlinePatterns) {
      if (pattern.test(lowerQuery)) {
        filters.hasDeadline = false;
        logger.warn('[Parse Query API] ✅ Filtre hasDeadline=false détecté:', query);
        break;
      }
    }
  }
}

function detectExcludedStatuses(query: string, lowerQuery: string, filters: Filters): void {
  // ========================================
  // PATTERNS D'EXCLUSION
  // ========================================
  // Détecte "sauf les archivés", "mais pas les annulés", "hors ghost prod", etc.
  const exclusionPatterns = [
    // "sauf les [statut]", "sauf [statut]"
    /sauf\s+(?:les?\s+)?(?:projets?\s+)?(ghost\s*prod(?:uction)?|termin[ée]s?|annul[ée]s?|archiv[ée]s?|en\s*cours|rework)/i,
    // "mais pas les [statut]", "mais pas [statut]"
    /mais\s+pas\s+(?:les?\s+)?(?:projets?\s+)?(ghost\s*prod(?:uction)?|termin[ée]s?|annul[ée]s?|archiv[ée]s?|en\s*cours|rework)/i,
    // "hors [statut]"
    /hors\s+(?:les?\s+)?(?:projets?\s+)?(ghost\s*prod(?:uction)?|termin[ée]s?|annul[ée]s?|archiv[ée]s?|en\s*cours|rework)/i,
    // "sans les [statut]" (différent de "sans deadline")
    /sans\s+(?:les?\s+)?(?:projets?\s+)?(ghost\s*prod(?:uction)?|termin[ée]s?|annul[ée]s?|archiv[ée]s?|rework)/i,
    // "excepté les [statut]"
    /except[ée]?\s+(?:les?\s+)?(?:projets?\s+)?(ghost\s*prod(?:uction)?|termin[ée]s?|annul[ée]s?|archiv[ée]s?|en\s*cours|rework)/i,
    // "excluding [status]", "except [status]"
    /(?:excluding|except)\s+(?:the\s+)?(ghost\s*prod(?:uction)?|finished|cancelled|archived|in\s*progress|rework)/i,
  ];

  const statusMappingForExclusion: Record<string, string> = {
    'ghost production': 'GHOST_PRODUCTION',
    'ghost prod': 'GHOST_PRODUCTION',
    ghostprod: 'GHOST_PRODUCTION',
    terminé: 'TERMINE',
    terminés: 'TERMINE',
    terminées: 'TERMINE',
    termine: 'TERMINE',
    finished: 'TERMINE',
    annulé: 'ANNULE',
    annulés: 'ANNULE',
    annulées: 'ANNULE',
    annule: 'ANNULE',
    cancelled: 'ANNULE',
    archivé: 'ARCHIVE',
    archivés: 'ARCHIVE',
    archivées: 'ARCHIVE',
    archive: 'ARCHIVE',
    archived: 'ARCHIVE',
    'en cours': 'EN_COURS',
    encours: 'EN_COURS',
    'in progress': 'EN_COURS',
    rework: 'A_REWORK',
  };

  for (const pattern of exclusionPatterns) {
    const match = lowerQuery.match(pattern);
    if (match && match[1]) {
      const excludedStatusText = match[1].toLowerCase().trim();
      const excludedStatus = statusMappingForExclusion[excludedStatusText];
      if (excludedStatus) {
        if (!filters.excludeStatuses || !Array.isArray(filters.excludeStatuses)) {
          filters.excludeStatuses = [];
        }
        const excludeStatuses = filters.excludeStatuses as string[];
        if (!excludeStatuses.includes(excludedStatus)) {
          excludeStatuses.push(excludedStatus);
        }
        logger.warn('[Parse Query API] ✅ Exclusion de statut détectée:', excludedStatus);
      }
    }
  }
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
  const filters: Record<string, unknown> = {};

  detectNoProgress(query, lowerQuery, filters);
  const fieldsToShow = detectFieldsToShow(lowerQuery);
  detectExactProgress(query, filters);
  detectProgressRange(lowerQuery, filters);
  detectStatus(query, lowerQuery, filters);
  detectCollab(query, filters, availableCollabs);
  detectStyle(query, filters, availableStyles);
  detectLabel(query, filters);
  detectLabelFinal(query, filters);
  detectDeadline(query, lowerQuery, filters);
  detectExcludedStatuses(query, lowerQuery, filters);

  return { filters, fieldsToShow };
}
