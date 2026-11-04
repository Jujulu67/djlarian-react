/**
 * Parser intelligent qui comprend le langage naturel FR + EN
 * Point d'entrée principal pour le parsing de requêtes
 */
import { classifyQuery } from './classifier';
import { detectFilters } from './filters';
import { extractCreateData } from './creates';
import { extractUpdateData } from './updates';
import { inferStatusFromContext } from './status-inference';
import {
  validateAndSanitizeQuery,
  validateConfig,
  validateConversationHistory,
  validateLastFilters,
} from './validation';
import { debugLog, truncate } from '../utils/debug-logger';
import type { ParseQueryResult } from '../types';
import type { ConversationMessage } from '../conversational/memory-manager';
import { logger } from '@/lib/logger';

/**
 * Parse une requête utilisateur et retourne les filtres, type, et données extraites
 * @param query - Requête utilisateur à parser
 * @param availableCollabs - Liste des collaborateurs disponibles
 * @param availableStyles - Liste des styles disponibles
 * @param conversationHistory - Historique de conversation optionnel pour inférer les filtres manquants
 * @param lastFilters - Filtres de la dernière requête pour inférer les filtres manquants dans les commandes de suivi
 * @returns Résultat du parsing avec filtres, type, et données extraites
 * @throws Error si les paramètres sont invalides
 */
export function parseQuery(
  query: string,
  availableCollabs: string[],
  availableStyles: string[],
  conversationHistory?: Array<{ role: string; content: string }>,
  lastFilters?: Record<string, unknown>
): ParseQueryResult {
  try {
    // Valider et nettoyer la requête
    query = validateAndSanitizeQuery(query);

    // Valider la configuration
    const { collabs, styles } = validateConfig(availableCollabs, availableStyles);

    // Valider l'historique de conversation
    const validatedHistory = validateConversationHistory(conversationHistory);

    // Valider les filtres de la dernière requête
    const validatedLastFilters = validateLastFilters(lastFilters);

    const lowerQuery = query.toLowerCase();

    // Détecter tous les filtres
    let { filters, fieldsToShow } = detectFilters(query, lowerQuery, collabs, styles);

    // Debug: Filters detected
    debugLog(
      'query-parser:filters',
      'Filtres détectés',
      {
        query: truncate(query),
        filters: Object.keys(filters),
        hasConversationHistory: !!conversationHistory,
      },
      { hypothesisId: 'B' }
    );

    // Infer status from context if this is a follow-up update command
    // Example: "passe les à en cours" after "liste projets annulés" → infer ANNULE
    const inferredStatus = inferStatusFromContext(
      query,
      filters,
      validatedLastFilters,
      validatedHistory as ConversationMessage[] | undefined
    );
    if (inferredStatus) {
      filters.status = inferredStatus;
      logger.warn('[Parse Query API] ✅ Status inféré:', inferredStatus);
    }

    // Classifier la requête
    const classification = classifyQuery(query, lowerQuery, filters);

    // Debug: Classification
    debugLog(
      'query-parser:classification',
      'Classification',
      {
        query: truncate(query),
        isList: classification.isList,
        isUpdate: classification.isUpdate,
        understood: classification.understood,
      },
      { hypothesisId: 'D' }
    );

    // Si c'est un message conversationnel long, ignorer les filtres détectés par hasard
    // (ils sont probablement des faux positifs)
    const shouldIgnoreFilters =
      classification.isConversationalQuestion &&
      query.length > 200 &&
      !classification.hasProjectMention;

    // Détecter si c'est une question sur l'assistant lui-même (pas sur les projets)
    if (classification.isMetaQuestion) {
      return {
        filters: {},
        type: 'search',
        understood: false, // Force l'appel à Groq
        clarification: null,
        isComplex: classification.isComplex,
      };
    }

    // PRIORITÉ: Si c'est une commande de modification (isUpdate), elle a la priorité sur les questions
    // Une commande comme "marque les projets comme TERMINE" peut être détectée comme isList ET isUpdate
    // Dans ce cas, isUpdate a la priorité
    const isQuestion =
      (classification.isList || classification.isCount) && !classification.isUpdate;

    // PRIORITÉ: Vérifier d'abord les patterns de notes (car "ajoute une note" pourrait être détecté comme création)
    // Si c'est une commande de modification, extraire les données de modification
    // AUSSI: Vérifier les patterns de notes même si isUpdate est false
    // (car les patterns de notes comme "magnetize, contenu" ne contiennent pas de verbe d'action)
    // MAIS: Ne pas extraire si c'est une question (liste, combien, etc.) SAUF si c'est aussi une commande de modification
    const shouldExtractUpdate = (classification.isUpdate || true) && !isQuestion;
    logger.warn(
      '[Parse Query API] 🔍 shouldExtractUpdate:',
      shouldExtractUpdate,
      'isUpdate:',
      classification.isUpdate,
      'isQuestion:',
      isQuestion
    );
    if (shouldExtractUpdate) {
      // Essayer d'extraire les données de mise à jour seulement si ce n'est pas une question
      // extractUpdateData retournera null si ce n'est pas une mise à jour
      const updateData = extractUpdateData(query, lowerQuery, filters, styles);
      logger.warn(
        '[Parse Query API] 🔍 extractUpdateData result:',
        updateData ? 'has data' : 'null',
        updateData
          ? Object.keys(updateData).filter(
              (k) => updateData[k as keyof typeof updateData] !== undefined
            )
          : ''
      );
      if (updateData) {
        // Si on a des données de mise à jour valides, la requête est comprise
        // Même si la classification initiale dit "understood: false", si on a réussi à extraire
        // des données de mise à jour (newStatus, newProgress, newStyle, etc.), c'est une commande valide
        const hasValidUpdateData =
          updateData.newProgress !== undefined ||
          updateData.newStatus !== undefined ||
          updateData.newDeadline !== undefined ||
          updateData.pushDeadlineBy !== undefined ||
          updateData.newCollab !== undefined ||
          updateData.newStyle !== undefined ||
          updateData.newLabel !== undefined ||
          updateData.newLabelFinal !== undefined ||
          updateData.newNote !== undefined;

        // Si on a des données de mise à jour valides, forcer understood à true
        if (hasValidUpdateData) {
          classification.understood = true;
          classification.isConversationalQuestion = false;
          logger.warn(
            '[Parse Query API] ✅ Requête comprise grâce aux données de mise à jour extraites'
          );
        }

        // Construire les filtres pour updateData (réutiliser ceux déjà détectés)
        const updateFilters: Record<string, unknown> = {};

        if (filters.minProgress !== undefined) {
          updateFilters.minProgress = filters.minProgress;
        }
        if (filters.maxProgress !== undefined) {
          updateFilters.maxProgress = filters.maxProgress;
        }
        if (filters.status) {
          updateFilters.status = filters.status;
        }
        if (filters.hasDeadline !== undefined) {
          updateFilters.hasDeadline = filters.hasDeadline;
        }
        if (filters.deadlineDate) {
          updateFilters.deadlineDate = filters.deadlineDate;
        }
        if (filters.noProgress !== undefined) {
          updateFilters.noProgress = filters.noProgress;
        }
        if (filters.collab) {
          updateFilters.collab = filters.collab;
        }
        if (filters.style) {
          updateFilters.style = filters.style;
        }
        if (filters.label) {
          updateFilters.label = filters.label;
        }
        if (filters.labelFinal) {
          updateFilters.labelFinal = filters.labelFinal;
        }

        return {
          filters: updateFilters,
          type: 'update',
          understood: true,
          lang: classification.lang,
          updateData,
          clarification: null,
          isComplex: classification.isComplex,
        };
      }
    }

    // PRIORITÉ: Si c'est une commande de création, extraire les données de création
    if (classification.isCreate && !classification.isUpdate) {
      const createData = extractCreateData(query, lowerQuery, collabs, styles);
      if (createData && createData.name) {
        // Si on a réussi à extraire un nom, c'est une commande de création valide
        logger.warn('[Parse Query API] ✅ Données de création extraites:', createData);
        return {
          filters: {},
          type: 'create',
          understood: true,
          lang: classification.lang,
          createData,
          clarification: null,
          isComplex: classification.isComplex,
        };
      }
    }

    // Déterminer le type de retour
    // PRIORITÉ: Si c'est une commande de modification, le type est 'update' même si isList est aussi true
    const type = classification.isUpdate
      ? 'update'
      : classification.isCount
        ? 'count'
        : classification.isList
          ? 'list'
          : classification.isCreate
            ? 'create'
            : 'search';

    // Générer le message de clarification si nécessaire
    const clarification = classification.understood
      ? null
      : classification.lang === 'en'
        ? "I didn't understand. Try: 'how many projects under 70%' or 'list my ghost prod'"
        : "Je n'ai pas compris. Essaie: 'combien de projets sous les 70%' ou 'liste mes ghost prod'";

    const finalResult = {
      // Si c'est conversationnel et long, ne pas retourner de filtres (probablement des faux positifs)
      filters: shouldIgnoreFilters ? {} : filters,
      type,
      understood: classification.understood,
      lang: classification.lang,
      isConversational: classification.isConversationalQuestion,
      isComplex: classification.isComplex,
      fieldsToShow: shouldIgnoreFilters
        ? undefined
        : fieldsToShow.length > 0
          ? fieldsToShow
          : undefined,
      clarification,
    };

    // Debug: Final result
    debugLog(
      'query-parser:result',
      'Résultat final',
      {
        type: finalResult.type,
        understood: finalResult.understood,
        isConversational: finalResult.isConversational,
      },
      { hypothesisId: 'D' }
    );

    return finalResult;
  } catch (error) {
    // Gestion d'erreur robuste : retourner un résultat sécurisé en cas d'erreur
    logger.error('[Parse Query API] ❌ Erreur lors du parsing:', error);

    return {
      filters: {},
      type: 'search',
      understood: false,
      clarification:
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors du parsing de la requête',
      isConversational: false,
      isComplex: true, // En cas d'erreur, utiliser 70B par sécurité
    };
  }
}
