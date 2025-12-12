/**
 * Types et interfaces pour l'extraction des données de mise à jour
 */

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
  // Ajout de notes
  projectName?: string;
  newNote?: string;
}

/**
 * Patterns de statuts pour la détection
 */
export const statusPatterns: { pattern: RegExp; status: string }[] = [
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

/**
 * Helper pour les logs de debug (patterns matching)
 * Active uniquement si ASSISTANT_DEBUG_PATTERNS=true dans les variables d'environnement
 */
export const isDebugPatterns = () => process.env.ASSISTANT_DEBUG_PATTERNS === 'true';

export const debugLog = (...args: any[]) => {
  if (isDebugPatterns()) {
    console.log(...args);
  }
};
