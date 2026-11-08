/**
 * Extraction des données de création de projets depuis les requêtes
 */
import { parseRelativeDate } from '../parsers/date-parser';
import { findStyleFromString } from '../parsers/style-matcher';
import { logger } from '@/lib/logger';

const IGNORED_NAME_WORDS = ['le', 'la', 'les', 'un', 'une', 'projet', 'project', 'nouveau', 'new'];

export interface CreateData {
  name: string;
  collab?: string;
  deadline?: string;
  progress?: number;
  status?: string;
  style?: string;
}

/**
 * Patterns de statuts pour la détection
 */
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

/**
 * Patterns de collaborateurs
 */
const collabPatterns = [
  /collab(?:oration)?s?\s+(?:avec\s+)?(\w+)/i, // "collab avec X" ou "collab X"
  /(?:avec|feat\.?|ft\.?)\s+(\w+)/i, // "avec X", "feat X"
  /\b(\w+)\s+collab/i, // "X collab"
];

/**
 * Extrait le nom du projet (chaîne vide si non trouvé)
 */
function extractName(query: string): string {
  const namePatterns = [
    // Pattern le plus spécifique en premier : "ajoute le projet X" ou "créer le projet X"
    /(?:ajoute|ajouter|créer|créez|créé|crée|creer|creez|cree|add|create)\s+(?:(?:le|un|une|mon|nouveau|the|a|new)\s+)*(?:projet\s+|project\s+)?([a-z0-9_\s]+?)(?:\s+(?:en\s+collab|collab|avec|deadline|avancé|avance|progress|progression|il\s+est|c['’]?est|it\s+is|it['’]?s|status|statut)|$)/i,
    // Pattern avec "projet" explicite
    /(?:projet|project)\s+([a-z0-9_\s]+?)(?:\s+(?:en\s+collab|collab|avec|deadline|avancé|avance|progress|progression|il\s+est|c['’]?est|it\s+is|it['’]?s|status|statut)|$)/i,
    // Pattern "nouveau projet X"
    /nouveau\s+projet\s+([a-z0-9_\s]+?)(?:\s+(?:en\s+collab|collab|avec|deadline|avancé|avance|progress|progression|il\s+est|c['’]?est|it\s+is|it['’]?s|status|statut)|$)/i,
    // Pattern "new project X"
    /new\s+project\s+([a-z0-9_\s]+?)(?:\s+(?:en\s+collab|collab|avec|deadline|avancé|avance|progress|progression|il\s+est|c['’]?est|it\s+is|it['’]?s|status|statut)|$)/i,
  ];

  for (const pattern of namePatterns) {
    const match = pattern.exec(query);
    if (match?.[1]) {
      const potentialName = match[1].trim();
      // Vérifier que ce n'est pas un mot-clé ignoré
      if (potentialName && !IGNORED_NAME_WORDS.includes(potentialName.toLowerCase())) {
        logger.warn('[Parse Query API] ✅ Nom extrait avec pattern:', pattern, '→', potentialName);
        return potentialName;
      }
    }
  }

  // Si pas de nom trouvé, essayer un pattern simple (un seul mot après "ajoute le projet")
  const simplePattern =
    /(?:ajoute|ajouter|créer|créez|créé|crée|creer|creez|cree|add|create)\s+(?:(?:le|un|une|mon|nouveau|the|a|new)\s+)*(?:projet\s+|project\s+)?(\w+)(?:\s|$)/i;
  const simpleMatch = simplePattern.exec(query);
  if (simpleMatch?.[1]) {
    const potentialName = simpleMatch[1].trim();
    if (!IGNORED_NAME_WORDS.includes(potentialName.toLowerCase())) {
      logger.warn('[Parse Query API] ✅ Nom extrait avec pattern simple →', potentialName);
      return potentialName;
    }
  }

  return '';
}

/**
 * Extrait le collaborateur (undefined si non trouvé)
 */
function extractCollab(query: string, availableCollabs: string[]): string | undefined {
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
  for (const pattern of collabPatterns) {
    const match = pattern.exec(query);
    if (match?.[1]) {
      const collabName = match[1].trim();
      if (!ignoredWords.includes(collabName.toLowerCase())) {
        const matchedCollab = availableCollabs.find(
          (c) =>
            c.toLowerCase().includes(collabName.toLowerCase()) ||
            collabName.toLowerCase().includes(c.toLowerCase())
        );
        return matchedCollab || collabName;
      }
    }
  }
  return undefined;
}

/**
 * Extrait la deadline (null si non trouvée)
 */
function extractDeadline(query: string): ReturnType<typeof parseRelativeDate> | null {
  const deadlinePatterns = [
    /deadline\s+(?:pour\s+)?(?:le\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week|demain|tomorrow|aujourd['’]hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
    /(?:avec\s+)?deadline\s+(semaine\s+pro|semaine\s+prochaine|next\s+week|demain|tomorrow|aujourd['’]hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
    /(?:pour|à)\s+(?:le\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week|demain|tomorrow|aujourd['’]hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
    // Pattern spécifique pour "met une deadline à dans X mois"
    /(?:met|mets?|définis?|définir)\s+(?:une\s+)?deadline\s+(?:à|pour|pour\s+le)?\s*(dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?))/i,
  ];

  for (const pattern of deadlinePatterns) {
    const match = pattern.exec(query);
    if (match?.[1]) {
      const dateStr = match[1].trim();
      const parsedDate = parseRelativeDate(dateStr);
      if (parsedDate) {
        return parsedDate;
      }
    }
  }
  return null;
}

/**
 * Extrait l'avancement en % (undefined si non trouvé)
 */
function extractProgress(query: string): number | undefined {
  const progressPatterns = [
    /(?:avancé|avance|progress|progression)\s*(?:à|de|à\s+)?(\d+)\s*%/i,
    /(?<!\d)(\d+)\s*%\s*(?:d['’]?avancement|de\s+progress|de\s+progression)?/i,
    /(?<!\d)(?:à|à\s+)?(\d+)\s*%/i,
  ];

  for (const pattern of progressPatterns) {
    const match = pattern.exec(query);
    if (match?.[1]) {
      const progressValue = Number.parseInt(match[1], 10);
      if (!Number.isNaN(progressValue) && progressValue >= 0 && progressValue <= 100) {
        return progressValue;
      }
    }
  }
  return undefined;
}

/**
 * Extrait le statut ; EN_COURS par défaut
 */
function extractStatus(lowerQuery: string): string {
  for (const { pattern, status } of statusPatterns) {
    if (pattern.test(lowerQuery)) {
      return status;
    }
  }
  return 'EN_COURS';
}

/**
 * Extrait les données de création depuis une requête
 */
export function extractCreateData(
  query: string,
  lowerQuery: string,
  availableCollabs: string[],
  availableStyles: string[]
): CreateData | null {
  const createData: CreateData = { name: extractName(query) };

  const collab = extractCollab(query, availableCollabs);
  if (collab !== undefined) {
    createData.collab = collab;
  }

  const deadline = extractDeadline(query);
  if (deadline) {
    createData.deadline = deadline;
  }

  const progress = extractProgress(query);
  if (progress !== undefined) {
    createData.progress = progress;
  }

  // Extraire status si mentionné (sinon default à EN_COURS)
  createData.status = extractStatus(lowerQuery);

  // Extraire style avec détection améliorée (variations, alias, et dans le nom)
  // Le style est détecté mais on garde le nom tel quel (ex: "epic dnb" reste "epic dnb")
  const styleMatch = findStyleFromString(query, availableStyles);
  if (styleMatch) {
    createData.style = styleMatch.style;
    logger.warn('[Parse Query API] Style détecté:', {
      matchedText: styleMatch.matchedText,
      style: styleMatch.style,
      availableStyles: availableStyles,
    });
  } else {
    logger.warn('[Parse Query API] Aucun style détecté pour:', query);
  }

  // Si on a au moins un nom, c'est une commande de création valide
  if (createData.name) {
    logger.warn('[Parse Query API] createData final:', createData);
    return createData;
  }

  return null;
}
