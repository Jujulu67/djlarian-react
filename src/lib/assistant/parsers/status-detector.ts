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

/**
 * Détecte et mappe un statut depuis la requête (utilise la similarité de chaînes)
 * Pas de requête IA intermédiaire - approche purement algorithmique
 */
export function detectStatusFromQuery(query: string): string | null {
  const lowerQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();

  const availableStatuses = [
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

  // Extraire les mots de la requête
  const queryWords = lowerQuery.split(/\s+/);

  // Pour chaque statut, chercher le meilleur match
  let bestMatch: { status: string; score: number } | null = null;

  for (const status of availableStatuses) {
    for (const keyword of status.keywords) {
      const keywordLower = keyword.toLowerCase();

      // Vérifier si le mot-clé est contenu dans la requête (match exact partiel)
      if (lowerQuery.includes(keywordLower) || keywordLower.includes(lowerQuery)) {
        const score = 1.0;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { status: status.value, score };
          console.warn(
            `[Assistant] Statut détecté par match exact: "${status.value}" (keyword: "${keyword}", query: "${query}")`
          );
          return status.value;
        }
      }

      // Calculer la similarité avec chaque mot de la requête
      for (const word of queryWords) {
        if (word.length < 3) continue; // Ignorer les mots trop courts

        // Exclure explicitement "projets" et "projet" pour éviter les faux positifs avec "prod"
        if (word === 'projets' || word === 'projet') continue;

        const distance = levenshteinDistance(word, keywordLower);
        const maxLength = Math.max(word.length, keywordLower.length);
        const similarity = 1 - distance / maxLength;

        // Pour GHOST_PRODUCTION, chercher aussi des combinaisons de mots avec patterns très flexibles
        if (status.value === 'GHOST_PRODUCTION') {
          // Patterns très flexibles pour détecter "ghost production" même avec beaucoup de fautes
          // "gauspraud", "gausprod", "gauspraud", "gaustprod", etc.
          const ghostPatterns = [
            /g[ao]?[su]?[so]?t/i, // gost, gast, gaost, gausot, etc.
            /g[ao]?[su]?[sp]/i, // gausp, gasp, gaosp, etc.
            /g[ao]?[su]?[sp]r/i, // gauspr, gaspr, etc.
          ];

          const prodPatterns = [
            /\bpro[ds]+\b/i, // prod, prods (mais pas "projets")
            /\bproduction\b/i, // production
            /praud/i, // praud (fautes de frappe)
            /prau/i, // prau
            /\bprod\b/i, // prod (mot entier, pas dans "projets")
          ];

          // Vérifier toutes les combinaisons
          // IMPORTANT: Ne pas matcher si c'est juste "projets" (sans "ghost" ou "gost")
          const hasGhostWord = ghostPatterns.some((p) => p.test(lowerQuery));
          const hasProdWord = prodPatterns.some((p) => p.test(lowerQuery));

          // Ne détecter que si on a à la fois un pattern "ghost" ET un pattern "prod"
          // ET que ce n'est pas juste "projets" seul
          if (hasGhostWord && hasProdWord) {
            // Vérifier qu'on n'a pas juste "projets" sans "ghost" avant
            const hasGhostBeforeProd =
              /(?:ghost|gost|gaus|gasp|gaust)\s*(?:prod|production|praud|prau)/i.test(lowerQuery);
            if (hasGhostBeforeProd) {
              const score = 0.8;
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = { status: status.value, score };
                console.warn(
                  `[Assistant] Statut détecté par pattern flexible: "${status.value}" (query: "${query}")`
                );
                return status.value;
              }
            }
          }

          // Pattern spécial pour "gauspraud" et variations similaires
          if (/gaus?praud|gaus?prod|gaus?prau/i.test(lowerQuery)) {
            const score = 0.85;
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = { status: status.value, score };
              console.warn(
                `[Assistant] Statut détecté par pattern spécial: "${status.value}" (query: "${query}")`
              );
              return status.value;
            }
          }
        }

        // Si la similarité est suffisante
        if (similarity >= status.minSimilarity) {
          if (!bestMatch || similarity > bestMatch.score) {
            bestMatch = { status: status.value, score: similarity };
          }
        }
      }
    }
  }

  if (bestMatch) {
    console.warn(
      `[Assistant] Statut détecté par similarité: "${bestMatch.status}" (score: ${bestMatch.score.toFixed(2)}, query: "${query}")`
    );
    return bestMatch.status;
  }

  return null;
}
