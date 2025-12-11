/**
 * Parser intelligent qui comprend le langage naturel FR + EN
 * Point d'entrée principal pour le parsing de requêtes
 */
import { classifyQuery } from './classifier';
import { detectFilters } from './filters';
import { extractCreateData } from './creates';
import { extractUpdateData } from './updates';
import type { ParseQueryResult } from '../types';

/**
 * Parse une requête utilisateur et retourne les filtres, type, et données extraites
 */
export function parseQuery(
  query: string,
  availableCollabs: string[],
  availableStyles: string[]
): ParseQueryResult {
  const lowerQuery = query.toLowerCase();

  // Détecter tous les filtres
  const { filters, fieldsToShow } = detectFilters(
    query,
    lowerQuery,
    availableCollabs,
    availableStyles
  );

  // Classifier la requête
  const classification = classifyQuery(query, lowerQuery, filters);

  // Détecter si c'est une question sur l'assistant lui-même (pas sur les projets)
  if (classification.isMetaQuestion) {
    return {
      filters: {},
      type: 'search',
      understood: false, // Force l'appel à Groq
      clarification: null,
    };
  }

  // Si c'est une commande de création, extraire les données du projet
  if (classification.isCreate) {
    const createData = extractCreateData(query, lowerQuery, availableCollabs, availableStyles);
    if (createData) {
      return {
        filters: {},
        type: 'create',
        understood: true,
        lang: classification.lang,
        createData,
        clarification: null,
      };
    }
  }

  // Si c'est une commande de modification, extraire les données de modification
  if (classification.isUpdate) {
    const updateData = extractUpdateData(query, lowerQuery, filters, availableStyles);
    if (updateData) {
      // Construire les filtres pour updateData (réutiliser ceux déjà détectés)
      const updateFilters: Record<string, any> = {};

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
      };
    }
  }

  // Déterminer le type de retour
  const type = classification.isCount ? 'count' : classification.isList ? 'list' : 'search';

  // Générer le message de clarification si nécessaire
  const clarification = classification.understood
    ? null
    : classification.lang === 'en'
      ? "I didn't understand. Try: 'how many projects under 70%' or 'list my ghost prod'"
      : "Je n'ai pas compris. Essaie: 'combien de projets sous les 70%' ou 'liste mes ghost prod'";

  return {
    filters,
    type,
    understood: classification.understood,
    lang: classification.lang,
    isConversational: classification.isConversationalQuestion,
    fieldsToShow: fieldsToShow.length > 0 ? fieldsToShow : undefined,
    clarification,
  };
}
