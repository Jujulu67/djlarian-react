/**
 * Extraction des données de mise à jour depuis les requêtes
 *
 * Ce module utilise des sous-modules spécialisés:
 * - progress-updates.ts: Extraction de progression (%)
 * - status-updates.ts: Extraction de statuts (X en Y)
 * - deadline-updates.ts: Extraction de deadlines (push/remove/set)
 * - metadata-updates.ts: Extraction collab/style/labels
 */
import { UpdateData } from './updates/types';
import {
  copyProgressFilters,
  extractDeXaYProgress,
  extractNewProgress,
} from './updates/progress-updates';
import { extractStatusUpdate } from './updates/status-updates';
import { extractDeadlineUpdate } from './updates/deadline-updates';
import { extractMetadataUpdate } from './updates/metadata-updates';
import { logger } from '@/lib/logger';

// Re-export UpdateData for backwards compatibility
export type { UpdateData } from './updates/types';

/**
 * Extrait les données de mise à jour depuis une requête
 */
export function extractUpdateData(
  query: string,
  lowerQuery: string,
  filters: Record<string, unknown>,
  availableStyles: string[]
): UpdateData | null {
  // Nettoyer les guillemets dans la requête pour éviter les problèmes de détection
  // Les guillemets peuvent être autour des statuts (ex: "en cours", "annulé")
  let cleanedQuery = query;
  cleanedQuery = cleanedQuery.replace(/"([^"]+)"/g, '$1'); // Enlever guillemets doubles
  cleanedQuery = cleanedQuery.replace(/'([^']+)'/g, '$1'); // Enlever guillemets simples
  const cleanedLowerQuery = cleanedQuery.toLowerCase();

  const updateData: UpdateData = {};

  // ========================================
  // EXTRACTION PROGRESSION (via module)
  // ========================================

  // Détecter pattern "de X% à Y" (ex: "passe de 10% à 15")
  extractDeXaYProgress(cleanedQuery, filters, updateData);

  // Copier les filtres de progression
  copyProgressFilters(filters, updateData);

  // Extraire hasDeadline
  if (filters.hasDeadline !== undefined && filters.hasDeadline !== null) {
    updateData.hasDeadline = filters.hasDeadline as boolean;
  }

  // Extraire collab (filtre)
  if (filters.collab && typeof filters.collab === 'string') {
    updateData.collab = filters.collab;
  }

  // Extraire style (filtre)
  // IMPORTANT: Ne pas copier filters.style si c'est un faux positif "Progressive" via "progression"
  if (filters.style && typeof filters.style === 'string') {
    const queryLower = cleanedQuery.toLowerCase();
    const hasProgressionKeywords =
      queryLower.includes('progression') ||
      queryLower.includes('avancement') ||
      (queryLower.includes('progress') && !queryLower.includes('progressive'));
    const hasExplicitStyleKeyword = queryLower.includes('style');

    // Si c'est "Progressive" et qu'on a des mots de progression sans "style", ignorer
    const isProgressionFalsePositive =
      filters.style === 'Progressive' && hasProgressionKeywords && !hasExplicitStyleKeyword;

    if (!isProgressionFalsePositive) {
      updateData.style = filters.style;
    } else {
      logger.warn(
        '[Parse Query API] ⚠️ filters.style "Progressive" ignoré dans updateData (faux positif via "prog" dans "progression")'
      );
    }
  }

  // Extraire label (filtre)
  if (filters.label && typeof filters.label === 'string') {
    updateData.label = filters.label;
  }

  // Extraire labelFinal (filtre)
  if (filters.labelFinal && typeof filters.labelFinal === 'string') {
    updateData.labelFinal = filters.labelFinal;
  }

  // Extraire nouvelle progression (via module)
  extractNewProgress(cleanedQuery, lowerQuery, filters, updateData);

  // ========================================
  // EXTRACTION STATUT (via module)
  // ========================================
  extractStatusUpdate(cleanedQuery, cleanedLowerQuery, filters, updateData);

  // ========================================
  // EXTRACTION DEADLINE (via module)
  // ========================================
  extractDeadlineUpdate(query, lowerQuery, filters, updateData);

  // ========================================
  // EXTRACTION METADATA (via module)
  // ========================================
  extractMetadataUpdate(query, cleanedQuery, filters, updateData, availableStyles);

  // Extraire les données de note (ajout de note à un projet spécifique)
  const noteData = extractNoteUpdateData(query, lowerQuery);
  if (noteData) {
    updateData.projectName = noteData.projectName;
    updateData.newNote = noteData.newNote;
    logger.warn('[Parse Query API] ✅ Données de note détectées:', noteData);
  }

  // Si on a au moins une modification à faire, c'est une commande de modification valide
  if (
    updateData.newProgress !== undefined ||
    updateData.newStatus !== undefined ||
    updateData.newDeadline !== undefined ||
    updateData.pushDeadlineBy !== undefined ||
    updateData.newCollab !== undefined ||
    updateData.newStyle !== undefined ||
    updateData.newLabel !== undefined ||
    updateData.newLabelFinal !== undefined ||
    updateData.newNote !== undefined
  ) {
    logger.warn('[Parse Query API] updateData final:', updateData);
    return updateData;
  }

  return null;
}

type NoteData = { projectName: string; newNote: string };

const CONVERSATIONAL_STARTERS = [
  /^et\s+(pour|avec|sans|sur|dans|sous)/i,
  /^pour\s+(les?|la|le|un|une|des?)/i,
  /^finalement/i,
  /^et\s+tu/i,
  /^et\s+pour/i,
];

// Exemples : « Session magnetize du jour », « Note pour magnetize », « Ajoute une note à … »
const NOTE_PATTERNS = [
  // "Session [nom] du jour, [contenu]"
  /session\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)\s+du\s+jour[,\s]+(.+)/i,
  // "Note pour [nom], [contenu]" ou "Note pour [nom]: [contenu]"
  /note\s+pour\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)[:,\s]+(.+)/i,
  // "Ajoute une note au projet dont [nom], [contenu]" (pattern spécifique pour "dont" - PRIORITAIRE)
  // Capture "dont [nom]" comme nom de projet complet
  /ajoute\s+(?:une\s+)?note\s+au\s+projet\s+dont\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)[:,\s]+(.+)/i,
  // "Ajoute une note au projet [nom], [contenu]" (pattern général pour "au projet" sans "dont")
  /ajoute\s+(?:une\s+)?note\s+au\s+projet\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)[:,\s]+(.+)/i,
  // "Ajoute une note à [nom], [contenu]" ou "Ajoute une note à [nom]: [contenu]"
  /ajoute\s+(?:une\s+)?note\s+à\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)[:,\s]+(.+)/i,
  // "Ajoute une note pour [nom] disant [contenu]" (pattern spécifique pour "disant" - PRIORITAIRE)
  /ajoute\s+(?:une\s+)?note\s+pour\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)\s+disant\s+(?:que\s+)?(.+)/i,
  // "Ajoute une note pour [nom] qui dit [contenu]" (pattern spécifique pour "qui dit" - PRIORITAIRE)
  /ajoute\s+(?:une\s+)?note\s+pour\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)\s+qui\s+dit\s+(?:que\s+)?(.+)/i,
  // "Ajoute une note pour [nom], [contenu]" ou "Ajoute une note pour [nom]: [contenu]" (pattern général - EN DERNIER)
  // Exclure les cas avec "qui dit" ou "disant" (gérés par les patterns spécifiques ci-dessus)
  // Le pattern général ne doit matcher que si le nom est suivi d'une virgule ou deux-points (pas juste un espace)
  /ajoute\s+(?:une\s+)?note\s+pour\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)[:,\s]+(?!.*\s+(?:qui\s+dit|disant))(.+)/i,
  // "Note [nom], [contenu]" (pattern plus simple)
  /^note\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)[:,\s]+(.+)/i,
  // "[nom], [contenu]" (pattern direct - nom de projet suivi d'une virgule et du contenu)
  // Exemple: "magnetize, aujourd'hui j'ai fait le break 2"
  // Ce pattern doit être placé en dernier car il est très permissif
  // On vérifie que le nom n'est pas un mot commun et qu'il y a du contenu après la virgule
  /^([a-z0-9_]+(?:\s+[a-z0-9_]+)*)\s*,\s+(.+)/i,
];
/** Motif « au projet dont [nom] » : « dont » fait partie du nom. */
const DONT_PATTERN_INDEX = 2;
/** Dernier motif, « [nom], [contenu] » : très permissif, le nom doit être vérifié. */
const DIRECT_PATTERN_INDEX = NOTE_PATTERNS.length - 1;

const DIRECT_NAME_COMMON_WORDS = new Set([
  'session',
  'note',
  'projet',
  'project',
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  'de',
  'du',
  'au',
  'aux',
  'pour',
  'avec',
  'sans',
  'sous',
  'sur',
  'dans',
  'par',
  'jour',
  'aujourd',
  'hui',
  'demain',
  'hier',
  'et',
  'ou',
  'mais',
  'donc',
  'car',
  'pizzas',
  'pizza',
]);
const DIRECT_NAME_CONNECTOR_WORDS = new Set([
  'et',
  'ou',
  'mais',
  'donc',
  'car',
  'pour',
  'avec',
  'sans',
  'les',
  'des',
  'du',
  'de',
  'la',
  'le',
]);
const DIRECT_NAME_COMMON_PHRASES = [' du jour', 'session', 'note pour', ' pour ', 'pizza'];
const DAY_NOTE_COMMON_WORDS = new Set([
  'session',
  'note',
  'projet',
  'project',
  'le',
  'la',
  'les',
  'et',
  'ou',
  'pour',
  'avec',
  'sans',
]);
const STARTS_WITH_CONNECTOR =
  /^(et|ou|mais|donc|car|puis|alors|ensuite|après|avant|pendant|depuis|jusqu|vers|chez|sans|avec|pour|contre|selon|malgré|grâce)\s+/i;
const STARTS_WITH_ARTICLE = /^(les?|des?|du|de|un|une)\s+[a-z]+/i;
const DAY_NOTE_PATTERN = /^([a-z0-9_]+(?:\s+[a-z0-9_]+)*)\s+du\s+jour[,\s]+(.+)/i;

/** Phrase conversationnelle, sauf si c'est explicitement un motif de note. */
function isConversationalQuery(query: string): boolean {
  return (
    CONVERSATIONAL_STARTERS.some((pattern) => pattern.test(query)) &&
    !/session\s+\w+\s+du\s+jour/i.test(query) &&
    !/note\s+pour\s+\w+/i.test(query)
  );
}

/** Le début d'un message « xxx, yyy » est-il vraiment un nom de projet ? */
function isPlausibleDirectName(projectName: string): boolean {
  const lowerName = projectName.toLowerCase();
  const words = lowerName.split(/\s+/);
  const connectorCount = words.filter((w) => DIRECT_NAME_CONNECTOR_WORDS.has(w)).length;

  const looksLikeSentence =
    DIRECT_NAME_COMMON_WORDS.has(lowerName) ||
    STARTS_WITH_CONNECTOR.test(projectName) ||
    (words.length > 2 && connectorCount / words.length > 0.3) ||
    DIRECT_NAME_COMMON_PHRASES.some((phrase) => lowerName.includes(phrase)) ||
    lowerName.startsWith('note ') ||
    lowerName === 'finalement' ||
    lowerName.startsWith('finalement ') ||
    (STARTS_WITH_ARTICLE.test(projectName) && words.length <= 3);

  return !looksLikeSentence && projectName.length <= 50;
}

/** Retire les guillemets en début et en fin (comme /^["']+|["']+$/g, en temps linéaire). */
function stripQuotes(text: string): string {
  const isQuote = (c: string | undefined) => c === '"' || c === "'";
  let start = 0;
  let end = text.length;
  while (start < end && isQuote(text[start])) start++;
  while (end > start && isQuote(text[end - 1])) end--;
  return text.slice(start, end);
}

function parseNoteMatch(match: RegExpMatchArray, patternIndex: number): NoteData | null {
  const isDirect = patternIndex === DIRECT_PATTERN_INDEX;
  const name = match[1].trim();
  const projectName = patternIndex === DONT_PATTERN_INDEX ? `dont ${name}` : name;
  // Les motifs généraux peuvent déborder sur « qui dit » ou « disant », gérés par d'autres motifs
  if (projectName.includes('qui dit') || projectName.includes('disant')) return null;
  if (isDirect && !isPlausibleDirectName(projectName)) return null;

  const newNote = stripQuotes(match[2].trim()).trim();
  const minLength = isDirect ? 3 : 2;
  return projectName.length >= minLength && newNote.length > 0 ? { projectName, newNote } : null;
}

/** « magnetize du jour, j'ai refait le mix » */
function parseDayNote(query: string): NoteData | null {
  const match = DAY_NOTE_PATTERN.exec(query);
  if (!match?.[1] || !match[2]) return null;
  const projectName = match[1].trim();
  const newNote = match[2].trim();
  const isProjectName =
    projectName.length >= 2 &&
    !DAY_NOTE_COMMON_WORDS.has(projectName.toLowerCase()) &&
    !STARTS_WITH_CONNECTOR.test(projectName);
  return isProjectName && newNote.length > 0 ? { projectName, newNote } : null;
}

/**
 * Extrait les données d'ajout de note depuis une requête
 * Détecte les patterns comme "Session [nom] du jour", "Note pour [nom]", etc.
 */
function extractNoteUpdateData(query: string, _lowerQuery: string): NoteData | null {
  if (isConversationalQuery(query)) return null;

  for (let i = 0; i < NOTE_PATTERNS.length; i++) {
    const match = query.match(NOTE_PATTERNS[i]);
    const note = match?.[1] && match[2] ? parseNoteMatch(match, i) : null;
    if (note) return note;
  }
  return parseDayNote(query);
}
