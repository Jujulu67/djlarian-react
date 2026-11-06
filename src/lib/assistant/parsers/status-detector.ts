/**
 * Détecteur de statuts depuis les requêtes utilisateur
 * Utilise la distance de Levenshtein pour détecter les statuts même avec des fautes d'orthographe
 */

/**
 * Calcule la distance de Levenshtein entre deux chaînes (similarité de chaînes)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }
  return matrix[len1][len2];
}

const STATUS_KEYWORDS = [
  {
    value: 'EN_COURS',
    keywords: [
      'en cours',
      'en cour',
      'encours',
      'in progress',
      'ongoing',
      // Fautes de frappe additionnelles
      'ancours',
      'emcours',
      'en courrs',
      'en coures',
      'n cours',
      'en cous',
      'encour',
      'en crs',
      'encoours',
      'wip',
      'work in progress',
    ],
    minSimilarity: 0.6, // Plus tolérant
  },
  {
    value: 'TERMINE',
    keywords: [
      'terminé',
      'termine',
      'terminée',
      'terminee',
      'terminés',
      'termines',
      'fini',
      'finis',
      'finie',
      'finies',
      'done',
      'complete',
      'completed',
      // Fautes de frappe additionnelles
      'treminer',
      'terminer',
      'termi',
      'termne',
      'terminne',
      'terminee',
      'teminé',
      'terniné',
      'temriné',
      'finit',
      'finnis',
      'achevé',
      'acheve',
      'finished',
    ],
    minSimilarity: 0.55, // Plus tolérant
  },
  {
    value: 'ANNULE',
    keywords: [
      'annulé',
      'annule',
      'annulée',
      'annulee',
      'annulés',
      'annules',
      'annulées',
      'annulees',
      'annul',
      'cancel',
      'cancelled',
      'canceled',
      // Fautes de frappe additionnelles
      'annler',
      'anul',
      'anulé',
      'annuler',
      'annullé',
      'anullé',
      'anuler',
      'abandonné',
      'abandonne',
      'dropped',
    ],
    minSimilarity: 0.6,
  },
  {
    value: 'A_REWORK',
    keywords: [
      'rework',
      'à rework',
      'a rework',
      'rewor',
      'à refaire',
      'a refaire',
      // Fautes de frappe additionnelles
      'rwork',
      're work',
      'reword',
      'rewok',
      'refaire',
      'à retravailler',
      'retravailler',
      'needs work',
      'needs rework',
    ],
    minSimilarity: 0.6,
  },
  {
    value: 'GHOST_PRODUCTION',
    keywords: [
      'ghost production',
      'ghostprod',
      'ghost prod',
      'ghos prod',
      'ghost',
      'ghosts',
      // Fautes de frappe additionnelles
      'ghosp rod',
      'goes prod',
      'gosht prod',
      'gost prod',
      'gostprod',
      'goshtprod',
      'ghosst prod',
      'ghots prod',
      'ghostproduction',
      'ghost-prod',
      'ghost-production',
      'ghosprod',
      'góstprod',
      'gauspraud',
      'gausprod',
      'goastprod',
      'gausteprauds',
      'gausotprod',
    ],
    minSimilarity: 0.4, // Très tolérant pour les fautes de frappe
  },
  {
    value: 'ARCHIVE',
    keywords: [
      'archivé',
      'archive',
      'archivée',
      'archivee',
      'archivés',
      'archives',
      'archivées',
      'archivees',
      'archiv',
      // Fautes de frappe additionnelles
      'arkivé',
      'arkive',
      'archiver',
      'archivee',
      'archived',
      'arch',
      'archve',
      'arcivé',
    ],
    minSimilarity: 0.6,
  },
];

const GHOST_PATTERNS = [
  /g[ao]?[su]?[so]?t/i, // gost, gast, gaost, gausot, etc.
  /g[ao]?[su]?[sp]/i, // gausp, gasp, gaosp, etc.
  /g[ao]?[su]?[sp]r/i, // gauspr, gaspr, etc.
];

const PROD_PATTERNS = [
  /\bpro[ds]+\b/i, // prod, prods (mais pas "projets")
  /\bproduction\b/i, // production
  /praud/i, // praud (fautes de frappe)
  /prau/i, // prau
  /\bprod\b/i, // prod (mot entier, pas dans "projets")
];

const GHOST_BEFORE_PROD_PATTERN =
  /(?:ghost|gost|gaus|gasp|gaust)\s*(?:prod|production|praud|prau)/i;
const GHOST_MISSPELLING_PATTERN = /gaus?praud|gaus?prod|gaus?prau/i;

/** Confiance que la requête parle de ghost production malgré les fautes (0 si non). */
function ghostProductionScore(lowerQuery: string): number {
  if (GHOST_MISSPELLING_PATTERN.test(lowerQuery)) return 0.85;
  const looksLikeGhostProd =
    GHOST_PATTERNS.some((p) => p.test(lowerQuery)) &&
    PROD_PATTERNS.some((p) => p.test(lowerQuery)) &&
    // « projets » seul ne suffit pas : il faut « ghost » juste avant
    GHOST_BEFORE_PROD_PATTERN.test(lowerQuery);
  return looksLikeGhostProd ? 0.8 : 0;
}

/** « projet(s) » et les mots trop courts donneraient de faux positifs. */
const isComparableWord = (word: string) =>
  word.length >= 3 && word !== 'projets' && word !== 'projet';

function bestSimilarity(words: string[], keyword: string): number {
  let best = 0;
  for (const word of words) {
    const maxLength = Math.max(word.length, keyword.length);
    best = Math.max(best, 1 - levenshteinDistance(word, keyword) / maxLength);
  }
  return best;
}

/**
 * Détecte et mappe un statut depuis la requête (utilise la similarité de chaînes)
 * Pas de requête IA intermédiaire - approche purement algorithmique
 */
export function detectStatusFromQuery(query: string): string | null {
  const lowerQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();

  const queryWords = lowerQuery.split(/\s+/).filter(isComparableWord);
  const ghostScore = queryWords.length > 0 ? ghostProductionScore(lowerQuery) : 0;

  let bestMatch: { status: string; score: number } | null = null;
  for (const status of STATUS_KEYWORDS) {
    for (const keyword of status.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (lowerQuery.includes(keywordLower) || keywordLower.includes(lowerQuery)) {
        return status.value;
      }
      if (status.value === 'GHOST_PRODUCTION' && ghostScore > (bestMatch?.score ?? 0)) {
        return status.value;
      }
      const similarity = bestSimilarity(queryWords, keywordLower);
      if (similarity >= status.minSimilarity && similarity > (bestMatch?.score ?? 0)) {
        bestMatch = { status: status.value, score: similarity };
      }
    }
  }
  return bestMatch?.status ?? null;
}
