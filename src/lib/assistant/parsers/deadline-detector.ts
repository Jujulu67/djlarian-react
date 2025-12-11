/**
 * Détecteur de deadlines depuis les requêtes utilisateur
 */
import { parseRelativeDate } from './date-parser';

/**
 * Détecte les filtres de deadline depuis la requête
 */
export function detectDeadlineFromQuery(query: string): {
  hasDeadline?: boolean;
  deadlineDate?: string;
} {
  const lowerQuery = query.toLowerCase();
  const result: { hasDeadline?: boolean; deadlineDate?: string } = {};

  // Patterns pour "avec deadline", "sans deadline", "qui ont une deadline"
  if (/avec\s*deadline|qui\s*ont\s*(?:une\s*)?deadline|deadline\s*prévue/i.test(lowerQuery)) {
    result.hasDeadline = true;
    console.log('[Assistant] Deadline détectée: hasDeadline = true');
  } else if (/sans\s*deadline|pas\s*de\s*deadline/i.test(lowerQuery)) {
    result.hasDeadline = false;
    console.log('[Assistant] Deadline détectée: hasDeadline = false');
  }

  // Patterns pour dates relatives : "vendredi", "lundi prochain", "dans 3 jours", etc.
  const datePatterns = [
    /(?:deadline|pour)\s*(?:le\s*)?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i,
    /(?:deadline|pour)\s*(?:le\s*)?(\d{1,2})\/(\d{1,2})/i, // DD/MM
    /(?:deadline|pour)\s*(?:le\s*)?(\d{4}-\d{2}-\d{2})/i, // YYYY-MM-DD
    /(?:dans|pour)\s*(\d+)\s*(?:jour|jours)/i,
    /(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*(?:prochain|prochaine)/i,
  ];

  for (const pattern of datePatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      // Utiliser parseRelativeDate pour convertir
      const dateStr = match[0];
      const parsed = parseRelativeDate(dateStr);
      if (parsed) {
        result.deadlineDate = parsed;
        console.log(`[Assistant] Date de deadline détectée: ${result.deadlineDate}`);
        return result;
      }
    }
  }

  return result;
}
