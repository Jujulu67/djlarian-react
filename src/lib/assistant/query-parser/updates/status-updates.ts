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

/** Motif d'un statut : GHOST_PRODUCTION a une forme dédiée pour éviter les faux positifs. */
function withGhostBoundary(status: string, source: string): string {
  return status === 'GHOST_PRODUCTION'
    ? String.raw`(?:ghost|gost)\s+prod(?:uction)?|ghostprod`
    : source;
}

/** Teste une paire de statuts (« X en Y » ou « de X à Y ») et renvoie le match valide. */
function matchStatusPair(
  cleanedQuery: string,
  first: StatusCandidate,
  second: StatusCandidate
): BestMatch | null {
  const { source: pattern1Source, status: status1 } = first;
  const { source: pattern2Source, status: status2 } = second;
  const pattern1WithBoundary = withGhostBoundary(status1, pattern1Source);
  const pattern2WithBoundary = withGhostBoundary(status2, pattern2Source);

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
  if (!XEnYMatch && !deXaYMatch) return null;

  const isValid = validateStatusMatch(
    cleanedQuery,
    XEnYMatch ? XEnYPattern : null,
    deXaYMatch ? deXaYPattern : null,
    first,
    second
  );
  if (!isValid) return null;

  const match = (XEnYMatch ? XEnYPattern : deXaYPattern).exec(cleanedQuery);
  return { status1, status2, matchLength: match ? match[0].length : 0 };
}

/** Meilleur match « X en Y » / « de X à Y » (le plus long) parmi toutes les paires de statuts. */
function findBestStatusMatch(cleanedQuery: string): BestMatch | null {
  let bestMatch: BestMatch | null = null;
  const toCandidate = (p: (typeof statusPatterns)[number]): StatusCandidate => ({
    pattern: p.pattern,
    source: p.pattern.source,
    status: p.status,
  });

  for (const firstPattern of statusPatterns) {
    for (const secondPattern of statusPatterns) {
      if (firstPattern.status === secondPattern.status) continue;

      const match = matchStatusPair(
        cleanedQuery,
        toCandidate(firstPattern),
        toCandidate(secondPattern)
      );
      if (match && (!bestMatch || match.matchLength > bestMatch.matchLength)) {
        bestMatch = match;
      }
    }
  }
  return bestMatch;
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
  const bestMatch = findBestStatusMatch(cleanedQuery);

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

/** Un texte capturé est valide pour un statut GHOST_PRODUCTION s'il contient « ghost » ou « gost ». */
function isGhostTextValid(status: string, trimmedText: string): boolean {
  return (
    status !== 'GHOST_PRODUCTION' || trimmedText.includes('ghost') || trimmedText.includes('gost')
  );
}

/** Valide la capture « X en Y » : chaque partie doit correspondre à son statut et ne pas être un « projet ». */
function validateXEnYCapture(
  match: RegExpExecArray | null,
  first: StatusCandidate,
  second: StatusCandidate
): boolean {
  if (!match?.[1] || !match[2]) return false;

  const match1Trimmed = match[1].trim().toLowerCase();
  const match2Trimmed = match[2].trim().toLowerCase();

  // Vérifier que les matches correspondent aux patterns
  const isMatch1Valid =
    first.pattern.test(match[1]) && isGhostTextValid(first.status, match1Trimmed);
  const isMatch2Valid =
    second.pattern.test(match[2]) && isGhostTextValid(second.status, match2Trimmed);

  // Vérifier que ce n'est pas dans "projets"
  const isNotProjet = (text: string) => !text.includes('projets') && !text.includes('projet');

  return isMatch1Valid && isMatch2Valid && isNotProjet(match1Trimmed) && isNotProjet(match2Trimmed);
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
  const { pattern: pattern1, source: pattern1Source } = first;
  const { pattern: pattern2, source: pattern2Source } = second;
  if (XEnYPattern) {
    return validateXEnYCapture(XEnYPattern.exec(cleanedQuery), first, second);
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
