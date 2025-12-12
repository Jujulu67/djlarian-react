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
 * Ces patterns sont utilisés pour détecter les statuts dans les requêtes
 * et doivent être très tolérants aux fautes de frappe
 */
export const statusPatterns: { pattern: RegExp; status: string }[] = [
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
