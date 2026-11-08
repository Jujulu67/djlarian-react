/**
 * Extraction des données de statut depuis les requêtes
 * Gère les patterns "X en Y" et "de X à Y" pour les changements de statut
 */
import { UpdateData, statusPatterns } from './types';
import { logger } from '@/lib/logger';

interface BestMatch {
  status1: string;
  status2: string;
  matchLength: number;
}

/**
 * Extrait les données de changement de statut depuis une requête
 * Détecte les patterns "X en Y" (ex: "projets en cours en annulé")
 * et "de X à Y" (ex: "de EN_COURS à TERMINE")
 */
export function extractStatusUpdate(
  cleanedQuery: string,
  cleanedLowerQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): boolean {
  let foundEnXenYPattern = false;
  let bestMatch: BestMatch | null = null;

  // Chercher les patterns "[statut1] en [statut2]" ou "de [statut1] à [statut2]"
  for (const { pattern: pattern1, status: status1 } of statusPatterns) {
    for (const { pattern: pattern2, status: status2 } of statusPatterns) {
      if (status1 === status2) continue;

      const pattern1Source = pattern1.source;
      const pattern2Source = pattern2.source;

      // Gérer GHOST_PRODUCTION spécialement pour éviter faux positifs
      const pattern1WithBoundary =
        status1 === 'GHOST_PRODUCTION'
          ? String.raw`(?:ghost|gost)\s+prod(?:uction)?|ghostprod`
          : pattern1Source;
      const pattern2WithBoundary =
        status2 === 'GHOST_PRODUCTION'
          ? String.raw`(?:ghost|gost)\s+prod(?:uction)?|ghostprod`
          : pattern2Source;

      // Pattern "X en Y"
      const XEnYPattern = new RegExp(
        String.raw`(?:marque|marquer|marques|marquez|mets?|met|mettez|mettre|change|changer|changes|changez|modifie|modifier|modifiez|passe|passer|passes|passez)\s+(?:les?\s+)?(?:projets?\s+)?(${pattern1WithBoundary})\s+en\s+(${pattern2WithBoundary})`,
        'i'
      );

      // Pattern "de X à Y"
      const deXaYPattern = new RegExp(
        String.raw`(?:marque|marquer|marques|marquez|mets?|met|mettez|mettre|change|changer|changes|changez|modifie|modifier|modifiez|passe|passer|passes|passez)\s+(?:les?\s+)?(?:projets?\s+)?de\s+${pattern1Source}\s+à\s+${pattern2Source}(?:\s|$)`,
        'i'
      );

      const XEnYMatch = XEnYPattern.test(cleanedQuery);
      const deXaYMatch = deXaYPattern.test(cleanedQuery);

      if (XEnYMatch || deXaYMatch) {
        const isValid = validateStatusMatch(
          cleanedQuery,
          XEnYMatch ? XEnYPattern : null,
          deXaYMatch ? deXaYPattern : null,
          { pattern: pattern1, source: pattern1Source, status: status1 },
          { pattern: pattern2, source: pattern2Source, status: status2 }
        );

        if (isValid) {
          const match = (XEnYMatch ? XEnYPattern : deXaYPattern).exec(cleanedQuery);
          const matchLength = match ? match[0].length : 0;
          if (!bestMatch || matchLength > bestMatch.matchLength) {
            bestMatch = { status1, status2, matchLength };
          }
        }
      }
    }
  }

  // Appliquer le meilleur match trouvé
  if (bestMatch) {
    updateData.status = bestMatch.status1;
    updateData.newStatus = bestMatch.status2;
    if (filters.status === bestMatch.status1) {
      delete filters.status;
    }
    logger.warn('[Parse Query API] ✅ Pattern "X en Y" ou "de X à Y" détecté:', {
      filtre: bestMatch.status1,
      nouvelleValeur: bestMatch.status2,
    });
    foundEnXenYPattern = true;
  }

  // Copier le filtre de statut si pas de pattern "X en Y"
  if (!foundEnXenYPattern && filters.status && typeof filters.status === 'string') {
    updateData.status = filters.status;
  }

  // Chercher nouveau statut avec patterns de verbes
  if (!foundEnXenYPattern) {
    extractSimpleStatusUpdate(cleanedQuery, cleanedLowerQuery, filters, updateData);
  }

  return foundEnXenYPattern;
}

/** Un statut candidat : son motif compilé, la source du motif et le nom du statut */
interface StatusCandidate {
  pattern: RegExp;
  source: string;
  status: string;
}

/**
 * Valide qu'un match de statut est correct (pas un faux positif)
 */
function validateStatusMatch(
  cleanedQuery: string,
  XEnYPattern: RegExp | null,
  deXaYPattern: RegExp | null,
  first: StatusCandidate,
  second: StatusCandidate
): boolean {
  const { pattern: pattern1, source: pattern1Source, status: status1 } = first;
  const { pattern: pattern2, source: pattern2Source, status: status2 } = second;
  if (XEnYPattern) {
    const match = XEnYPattern.exec(cleanedQuery);
    if (!match?.[1] || !match[2]) return false;

    const match1Trimmed = match[1].trim().toLowerCase();
    const match2Trimmed = match[2].trim().toLowerCase();

    // Vérifier que les matches correspondent aux patterns
    const match1IsStatus1 = pattern1.test(match[1]);
    const match2IsStatus2 = pattern2.test(match[2]);

    // Pour GHOST_PRODUCTION, doit contenir "ghost"
    const isMatch1Valid =
      match1IsStatus1 &&
      (status1 === 'GHOST_PRODUCTION'
        ? match1Trimmed.includes('ghost') || match1Trimmed.includes('gost')
        : true);
    const isMatch2Valid =
      match2IsStatus2 &&
      (status2 === 'GHOST_PRODUCTION'
        ? match2Trimmed.includes('ghost') || match2Trimmed.includes('gost')
        : true);

    // Vérifier que ce n'est pas dans "projets"
    const match1NotInProjets =
      !match1Trimmed.includes('projets') && !match1Trimmed.includes('projet');
    const match2NotInProjets =
      !match2Trimmed.includes('projets') && !match2Trimmed.includes('projet');

    return isMatch1Valid && isMatch2Valid && match1NotInProjets && match2NotInProjets;
  }

  if (deXaYPattern) {
    const patternWithCapture = new RegExp(
      String.raw`(?:marque|marquer|marques|marquez|mets?|met|mettez|mettre|change|changer|changes|changez|modifie|modifier|modifiez|passe|passer|passes|passez)\s+(?:les?\s+)?(?:projets?\s+)?de\s+(${pattern1Source})\s+à\s+(${pattern2Source})(?:\s|$)`,
      'i'
    );
    const match = patternWithCapture.exec(cleanedQuery);
    if (!match?.[1] || !match[2]) return false;

    return pattern1.test(match[1]) && pattern2.test(match[2]);
  }

  return false;
}

/**
 * Extrait un nouveau statut simple (sans pattern X en Y)
 */
function extractSimpleStatusUpdate(
  cleanedQuery: string,
  cleanedLowerQuery: string,
  filters: Record<string, unknown>,
  updateData: UpdateData
): void {
  for (const { pattern, status } of statusPatterns) {
    // Skip si déjà utilisé comme filtre et pas après "en" ou "à"
    if (filters.status === status && updateData.status === status) {
      const statusAfterEnOrA = new RegExp(
        String.raw`(?:en|à|comme|as)\s+${pattern.source}`,
        'i'
      ).test(cleanedQuery);
      if (!statusAfterEnOrA) continue;
    }

    const statusWords = status.replace(/_/g, String.raw`[\s_]`).replace(/\s+/g, String.raw`[\s_]+`);
    const updateVerbPatterns = [
      new RegExp(
        String.raw`(?:marque|marquer|marques|marquez|mets?|met|mettez|mettre|change|changer|changes|changez|modifie|modifier|modifiez|passe|passer|passes|passez)\s+(?:les?\s+)?(?:projets?\s+)?(?:en|à|comme|as)\s+${pattern.source}`,
        'i'
      ),
      new RegExp(String.raw`(?:set|update|change|mark)\s+(?:to|as)\s+${pattern.source}`, 'i'),
      new RegExp(
        String.raw`(?:marque|marquer|marques|marquez|mets?|met|mettez|mettre|change|changer|changes|changez|modifie|modifier|modifiez|passe|passer|passes|passez)\s+(?:les?\s+)?(?:projets?\s+)?(?:en|à)\s+(${statusWords})`,
        'i'
      ),
      new RegExp(
        String.raw`(?:marque|marquer|marques|marquez|mets?|met|mettez|mettre|change|changer|changes|changez|modifie|modifier|modifiez|passe|passer|passes|passez)\s+(?:les?\s+)?(?:projets?\s+)?(?:en\s+\w+\s+)?en\s+${pattern.source}(?:\s|$)`,
        'i'
      ),
    ];

    for (const updateVerbPattern of updateVerbPatterns) {
      if (updateVerbPattern.test(cleanedQuery)) {
        updateData.newStatus = status;
        logger.warn('[Parse Query API] ✅ Nouveau statut détecté:', status);
        return;
      }
    }
  }
}
