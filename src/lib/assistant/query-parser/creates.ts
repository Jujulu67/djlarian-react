/**
 * Extraction des données de création de projets depuis les requêtes
 */
import { parseRelativeDate } from '../parsers/date-parser';
import { findStyleFromString } from '../parsers/style-matcher';

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
  { pattern: /ghost\s*prod(?:uction)?|ghostprod|gost\s*prod/i, status: 'GHOST_PRODUCTION' },
  {
    pattern: /termin[ée]s?|finis?|complet[ée]?s?|finished|completed|done|100\s*%|TERMINE/i,
    status: 'TERMINE',
  },
  { pattern: /annul[ée]s?|cancel(?:led)?|abandonn[ée]s?|dropped/i, status: 'ANNULE' },
  {
    pattern:
      /en\s*cours|ongoing|actifs?|in\s*(?:progress|the\s*works)|current|active|wip|EN\s*COURS|EN_COURS/i,
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
  /collab(?:oration)?s?\s+(?:avec\s+)?([A-Za-z0-9_]+)/i, // "collab avec X" ou "collab X"
  /(?:avec|feat\.?|ft\.?)\s+([A-Za-z0-9_]+)/i, // "avec X", "feat X"
  /([A-Za-z0-9_]+)\s+collab/i, // "X collab"
];

/**
 * Extrait les données de création depuis une requête
 */
export function extractCreateData(
  query: string,
  lowerQuery: string,
  availableCollabs: string[],
  availableStyles: string[]
): CreateData | null {
  const createData: CreateData = { name: '' };

  // Mots-clés qui indiquent la fin du nom du projet
  const stopWords = [
    'en collab',
    'collab',
    'avec',
    'deadline',
    'avancé',
    'avance',
    'progress',
    'progression',
    'il est',
    "c'est",
    'it is',
    "it's",
    'status',
    'statut',
  ];

  // Fonction pour extraire le nom en s'arrêtant aux mots-clés
  const extractNameWithStopWords = (text: string, startPattern: RegExp): string | null => {
    const match = text.match(startPattern);
    if (!match) return null;

    const startIndex = match.index! + match[0].length;
    let nameEndIndex = text.length;

    // Trouver le premier mot-clé d'arrêt après le début
    for (const stopWord of stopWords) {
      const stopIndex = text.toLowerCase().indexOf(stopWord.toLowerCase(), startIndex);
      if (stopIndex !== -1 && stopIndex < nameEndIndex) {
        nameEndIndex = stopIndex;
      }
    }

    const extracted = text.substring(startIndex, nameEndIndex).trim();
    if (!extracted) return null;

    // Vérifier que ce n'est pas un mot-clé ignoré
    const ignoredWords = ['le', 'la', 'les', 'un', 'une', 'projet', 'project', 'nouveau', 'new'];
    if (ignoredWords.includes(extracted.toLowerCase())) return null;

    return extracted;
  };

  // Essayer différents patterns pour trouver le nom
  const namePatterns = [
    /(?:projet|project)\s+/i,
    /(?:ajoute|ajouter|créer|créé|add|create)\s+(?:le\s+)?(?:projet\s+)?/i,
    /nouveau\s+projet\s+/i,
    /new\s+project\s+/i,
  ];

  for (const pattern of namePatterns) {
    const name = extractNameWithStopWords(query, pattern);
    if (name) {
      createData.name = name;
      break;
    }
  }

  // Si pas de nom trouvé, essayer un pattern simple (un seul mot)
  if (!createData.name) {
    const simplePattern =
      /(?:ajoute|ajouter|créer|créé|add|create)\s+(?:le\s+)?(?:projet\s+)?([A-Za-z0-9_]+)(?:\s|$)/i;
    const match = query.match(simplePattern);
    if (match && match[1]) {
      const potentialName = match[1].trim();
      const ignoredWords = ['le', 'la', 'les', 'un', 'une', 'projet', 'project', 'nouveau', 'new'];
      if (!ignoredWords.includes(potentialName.toLowerCase())) {
        createData.name = potentialName;
      }
    }
  }

  // Extraire collab (réutiliser la logique existante avec collabPatterns)
  for (const pattern of collabPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const collabName = match[1].trim();
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
      if (!ignoredWords.includes(collabName.toLowerCase())) {
        const matchedCollab = availableCollabs.find(
          (c) =>
            c.toLowerCase().includes(collabName.toLowerCase()) ||
            collabName.toLowerCase().includes(c.toLowerCase())
        );
        createData.collab = matchedCollab || collabName;
        break;
      }
    }
  }

  // Extraire deadline
  const deadlinePatterns = [
    /deadline\s+(?:pour\s+)?(?:le\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
    /(?:avec\s+)?deadline\s+(semaine\s+pro|semaine\s+prochaine|next\s+week|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
    /(?:pour|à)\s+(?:le\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
    // Pattern spécifique pour "met une deadline à dans X mois"
    /(?:met|mets?|définis?|définir)\s+(?:une\s+)?deadline\s+(?:à|pour|pour\s+le)?\s*(dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?))/i,
  ];

  for (const pattern of deadlinePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const dateStr = match[1].trim();
      const parsedDate = parseRelativeDate(dateStr);
      if (parsedDate) {
        createData.deadline = parsedDate;
        break;
      }
    }
  }

  // Extraire progress (e.g., "70%", "avancé à 70%")
  const progressPatterns = [
    /(?:avancé|avance|progress|progression)\s*(?:à|de|à\s+)?(\d+)\s*%/i,
    /(\d+)\s*%\s*(?:d['']?avancement|de\s+progress|de\s+progression)?/i,
    /(?:à|à\s+)?(\d+)\s*%/i,
  ];

  for (const pattern of progressPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const progressValue = parseInt(match[1], 10);
      if (!isNaN(progressValue) && progressValue >= 0 && progressValue <= 100) {
        createData.progress = progressValue;
        break;
      }
    }
  }

  // Extraire status si mentionné (sinon default à EN_COURS)
  for (const { pattern, status } of statusPatterns) {
    if (pattern.test(lowerQuery)) {
      createData.status = status;
      break;
    }
  }

  // Si pas de status spécifié, default à EN_COURS
  if (!createData.status) {
    createData.status = 'EN_COURS';
  }

  // Extraire style avec détection améliorée (variations, alias, et dans le nom)
  // Le style est détecté mais on garde le nom tel quel (ex: "epic dnb" reste "epic dnb")
  const styleMatch = findStyleFromString(query, availableStyles);
  if (styleMatch) {
    createData.style = styleMatch.style;
    console.log('[Parse Query API] Style détecté:', {
      matchedText: styleMatch.matchedText,
      style: styleMatch.style,
      availableStyles: availableStyles,
    });
  } else {
    console.log('[Parse Query API] Aucun style détecté pour:', query);
  }

  // Si on a au moins un nom, c'est une commande de création valide
  if (createData.name) {
    console.log('[Parse Query API] createData final:', createData);
    return createData;
  }

  return null;
}
