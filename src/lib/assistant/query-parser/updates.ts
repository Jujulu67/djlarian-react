/**
 * Extraction des données de mise à jour depuis les requêtes
 *
 * Ce module utilise des sous-modules spécialisés:
 * - progress-updates.ts: Extraction de progression (%)
 * - status-updates.ts: Extraction de statuts (X en Y)
 * - deadline-updates.ts: Extraction de deadlines (push/remove/set)
 * - metadata-updates.ts: Extraction collab/style/labels
 */
import { parseRelativeDate } from '../parsers/date-parser';
import { findStyleFromString } from '../parsers/style-matcher';
import { UpdateData, statusPatterns, debugLog } from './updates/types';
import {
  copyProgressFilters,
  extractDeXaYProgress,
  extractNewProgress,
} from './updates/progress-updates';
import { extractStatusUpdate } from './updates/status-updates';
import { extractDeadlineUpdate } from './updates/deadline-updates';
import { extractMetadataUpdate } from './updates/metadata-updates';

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
  if (filters.style && typeof filters.style === 'string') {
    updateData.style = filters.style;
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
    console.warn('[Parse Query API] ✅ Données de note détectées:', noteData);
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
    console.warn('[Parse Query API] updateData final:', updateData);
    return updateData;
  }

  return null;
}

/**
 * Extrait les données d'ajout de note depuis une requête
 * Détecte les patterns comme "Session [nom] du jour", "Note pour [nom]", etc.
 */
function extractNoteUpdateData(
  query: string,
  lowerQuery: string
): { projectName: string; newNote: string } | null {
  // Vérification préalable : exclure les phrases conversationnelles évidentes
  // Si la requête commence par des mots de liaison ou contient des patterns conversationnels,
  // ne pas essayer d'extraire une note
  const conversationalStarters = [
    /^et\s+(pour|avec|sans|sur|dans|sous)/i,
    /^pour\s+(les?|la|le|un|une|des?)/i,
    /^finalement/i,
    /^et\s+tu/i,
    /^et\s+pour/i,
  ];

  const isConversationalStarter = conversationalStarters.some((pattern) => pattern.test(query));
  if (
    isConversationalStarter &&
    !query.match(/session\s+\w+\s+du\s+jour/i) &&
    !query.match(/note\s+pour\s+\w+/i)
  ) {
    // C'est probablement une phrase conversationnelle, pas une note
    // Sauf si c'est explicitement un pattern de note comme "Session X du jour" ou "Note pour X"
    console.warn(
      '[Parse Query API] ⚠️ Phrase conversationnelle détectée, skip extraction de note:',
      query
    );
    return null;
  }

  // Patterns pour détecter l'ajout de notes
  // Exemples: "Session magnetize du jour", "Note pour magnetize", "Ajoute une note à magnetize", "magnetize, contenu"
  const notePatterns = [
    // "Session [nom] du jour, [contenu]"
    /session\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)\s+du\s+jour[,\s]+(.+)/i,
    // "Note pour [nom], [contenu]" ou "Note pour [nom]: [contenu]"
    /note\s+pour\s+([a-z0-9_]+(?:\s+[a-z0-9_]+)*)[:,\s]+(.+)/i,
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

  for (let i = 0; i < notePatterns.length; i++) {
    const pattern = notePatterns[i];
    const match = query.match(pattern);
    if (match && match[1] && match[2]) {
      const projectName = match[1].trim();
      let noteContent = match[2].trim();

      // Ignorer si le nom du projet contient "qui dit" ou "disant" (géré par les patterns spécifiques)
      // Cela peut arriver avec les patterns généraux qui sont trop permissifs
      if (projectName.includes('qui dit') || projectName.includes('disant')) {
        continue; // Ignorer ce match, continuer avec le pattern suivant
      }

      // Nettoyer les guillemets en début et fin de contenu
      noteContent = noteContent.replace(/^["']+|["']+$/g, '').trim();

      // Pour le dernier pattern (pattern direct "[nom], [contenu]"), vérifier que ce n'est pas un mot commun
      if (i === notePatterns.length - 1) {
        const commonWords = [
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
        ];
        const lowerProjectName = projectName.toLowerCase();

        // Vérifier si c'est un mot commun exact
        if (commonWords.includes(lowerProjectName)) {
          continue; // Ignorer ce match, ce n'est probablement pas un nom de projet
        }

        // Vérifier si le nom commence par des mots de liaison (phrases conversationnelles)
        const startsWithConnector =
          /^(et|ou|mais|donc|car|puis|alors|ensuite|après|avant|pendant|depuis|jusqu|vers|chez|sans|avec|pour|contre|selon|malgré|grâce)\s+/i.test(
            projectName
          );
        if (startsWithConnector) {
          continue; // Ignorer ce match, c'est probablement une phrase conversationnelle
        }

        // Vérifier si le nom contient plusieurs mots de liaison (probablement une phrase complète)
        const connectorWords = [
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
        ];
        const words = lowerProjectName.split(/\s+/);
        const connectorCount = words.filter((w) => connectorWords.includes(w)).length;
        // Si plus de 30% des mots sont des mots de liaison, c'est probablement une phrase
        if (words.length > 2 && connectorCount / words.length > 0.3) {
          continue; // Ignorer ce match, trop de mots de liaison pour être un nom de projet
        }

        // Vérifier si le nom contient des mots communs (ex: "Session du jour", "a du jour")
        // Un nom de projet ne devrait pas contenir "du jour", "Session", etc.
        const containsCommonPhrases =
          lowerProjectName.includes(' du jour') ||
          lowerProjectName.includes('session') ||
          lowerProjectName.includes('note pour') ||
          lowerProjectName.startsWith('session ') ||
          lowerProjectName.startsWith('note ') ||
          lowerProjectName.includes(' pour les ') ||
          lowerProjectName.includes(' pour la ') ||
          lowerProjectName.includes(' pour le ') ||
          lowerProjectName.includes(' pour ') ||
          lowerProjectName.includes('pizzas') ||
          lowerProjectName.includes('pizza') ||
          lowerProjectName === 'finalement' ||
          lowerProjectName.startsWith('finalement ');

        if (containsCommonPhrases) {
          continue; // Ignorer ce match
        }

        // Vérifier si le nom ressemble à une phrase conversationnelle (contient des articles + noms communs)
        // Exemples: "les pizzas", "la musique", "le sport"
        const looksLikeConversationalPhrase = /^(les?|des?|du|de|un|une)\s+[a-z]+/i.test(
          projectName
        );
        if (looksLikeConversationalPhrase && words.length <= 3) {
          // Si c'est court (<= 3 mots) et commence par un article, c'est probablement une phrase
          continue; // Ignorer ce match
        }

        // Vérifier que le nom n'est pas trop long (probablement une phrase complète capturée par erreur)
        // Un nom de projet raisonnable ne devrait pas dépasser 50 caractères
        if (projectName.length > 50) {
          continue; // Ignorer ce match, trop long pour être un nom de projet
        }
      }

      // Nettoyer le contenu de la note (enlever les mots-clés inutiles au début)
      const ignoredStartWords = ["j'ai", "j'", 'je', 'il', 'elle', 'on', 'nous'];
      for (const word of ignoredStartWords) {
        if (noteContent.toLowerCase().startsWith(word + ' ')) {
          // Garder le mot mais continuer le nettoyage
          break;
        }
      }

      // Vérifier que le nom du projet n'est pas trop court (au moins 2 caractères)
      // Pour le pattern direct, on exige au moins 3 caractères pour éviter les faux positifs
      const minLength = i === notePatterns.length - 1 ? 3 : 2;
      if (projectName.length >= minLength && noteContent.length > 0) {
        console.warn('[Parse Query API] ✅ Note détectée:', {
          projectName,
          noteContent: noteContent.substring(0, 50) + '...',
          patternIndex: i,
        });
        return {
          projectName,
          newNote: noteContent,
        };
      }
    }
  }

  // Pattern alternatif : détecter si la requête commence par un nom de projet
  // suivi d'un contenu (ex: "magnetize du jour, j'ai refait le mix")
  const directPattern = /^([a-z0-9_]+(?:\s+[a-z0-9_]+)*)\s+du\s+jour[,\s]+(.+)/i;
  const directMatch = query.match(directPattern);
  if (directMatch && directMatch[1] && directMatch[2]) {
    const projectName = directMatch[1].trim();
    const noteContent = directMatch[2].trim();

    // Vérifier que ce n'est pas juste un mot commun
    const commonWords = [
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
    ];

    // Vérifier si le nom commence par des mots de liaison (phrases conversationnelles)
    const startsWithConnector =
      /^(et|ou|mais|donc|car|puis|alors|ensuite|après|avant|pendant|depuis|jusqu|vers|chez|sans|avec|pour|contre|selon|malgré|grâce)\s+/i.test(
        projectName
      );

    if (
      projectName.length >= 2 &&
      noteContent.length > 0 &&
      !commonWords.includes(projectName.toLowerCase()) &&
      !startsWithConnector
    ) {
      console.warn('[Parse Query API] ✅ Note détectée (pattern direct):', {
        projectName,
        noteContent: noteContent.substring(0, 50) + '...',
      });
      return {
        projectName,
        newNote: noteContent,
      };
    }
  }

  return null;
}
