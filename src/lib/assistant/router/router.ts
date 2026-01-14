/**
 * Routeur central pour les commandes projets
 *
 * Responsabilités :
 * - Classifier les requêtes utilisateur
 * - Router vers le bon handler (listing, création, modification, note, général)
 * - Garantir que le listing/filtrage/tri se fait côté client (0 DB)
 * - Préparer les actions nécessitant confirmation
 * - S'assurer que Groq ne peut jamais déclencher d'actions
 */

import type { Project, QueryFilters } from '@/lib/domain/projects';
import {
  ProjectCommandType,
  type ProjectCommandResult,
  type ProjectFilter,
  type ProjectMutation,
  type PendingConfirmationAction,
  type RouterContext,
  type RouterOptions,
} from './types';
import { classifyQuery } from '../query-parser/classifier';
import { detectFilters } from '../query-parser/filters';

import { debugLog, isAssistantDebugEnabled } from '../utils/debug';
import { sanitizeForLogs, sanitizeObjectForLogs } from '../utils/sanitize-logs';
import type { ConversationMessage } from '../conversational/memory-manager';

// Imports des helpers de filtrage extraits
import { summarizeFilter } from './filter-helpers';

// Import du client Groq extrait
import { callGroqApi } from './groq-client'; // Import des handlers internes extraits
import {
  handleDetailIntent,
  isCapabilitiesQuestion,
  getCapabilitiesResponse,
  handleConversationalQuery,
  handleCreateCommand,
  handleListCommand,
  handleUpdateCommand,
} from './router-handlers';

// Re-export public pour maintenir l'API existante
export { isScopingFilter } from './filter-helpers';

/**
 * Route une requête utilisateur vers le bon handler
 *
 * @param userMessage - Message de l'utilisateur
 * @param options - Options du routeur (contexte, historique, etc.)
 * @returns Résultat de la commande (listing, création, action en attente, ou réponse généraliste)
 */
export async function routeProjectCommand(
  userMessage: string,
  options: RouterOptions
): Promise<ProjectCommandResult> {
  const { context, conversationHistory, lastFilters, requestId } = options;
  const { projects, availableCollabs, availableStyles, projectCount } = context;

  // Logs d'entrée (debug) - Sanitizer le message utilisateur
  const sanitizedMessage = sanitizeForLogs(userMessage, 200);
  const logPrefix = requestId ? `[${requestId}]` : '';
  debugLog('router', `${logPrefix} 📥 Entrée du routeur`, {
    requestId,
    message: sanitizedMessage,
    projectsCount: projects.length,
    lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
    lastAppliedFilter: summarizeFilter(context.lastAppliedFilter),
    availableCollabs,
    availableStyles,
  });

  const lowerQuery = userMessage.toLowerCase();

  // Détecter les filtres depuis la requête
  const { filters, fieldsToShow } = detectFilters(
    userMessage,
    lowerQuery,
    availableCollabs,
    availableStyles
  );

  // Classifier la requête
  const classification = classifyQuery(userMessage, lowerQuery, filters);

  // Logs après classification (debug)
  debugLog('router', '🔍 Classification', {
    isList: classification.isList,
    isCount: classification.isCount,
    isUpdate: classification.isUpdate,
    isCreate: classification.isCreate,
    isConversationalQuestion: classification.isConversationalQuestion,
    hasActionVerb: classification.hasActionVerb,
    understood: classification.understood,
  });

  // Déterminer le chemin de décision
  let decisionPath = 'UNKNOWN';
  if (classification.isConversationalQuestion && !classification.hasActionVerb) {
    decisionPath = 'GENERAL';
  } else if (classification.isList || classification.isCount) {
    decisionPath = 'LIST';
  } else if (classification.isCreate && !classification.isUpdate) {
    decisionPath = 'CREATE';
  } else if (classification.isUpdate) {
    decisionPath = 'UPDATE';
  } else {
    decisionPath = 'GENERAL_FALLBACK';
  }

  debugLog('router', '🎯 DecisionPath', { path: decisionPath });

  // ========================================
  // GUARD : Intercepter "en détail" comme LIST refinement (AVANT Groq)
  // ========================================
  const detailIntentResult = handleDetailIntent(lowerQuery, projects, context, requestId);
  if (detailIntentResult.handled) {
    return detailIntentResult.result;
  }

  // ========================================
  // ROUTING : Question généraliste → Groq (lecture seule)
  // ========================================
  if (classification.isConversationalQuestion && !classification.hasActionVerb) {
    const normalized = userMessage.toLowerCase();

    // Guard: Intercepter les questions sur les fonctionnalités
    if (isCapabilitiesQuestion(normalized)) {
      console.warn('[Router] 🛡️ Interception question fonctionnalités (réponse hardcodée)');
      return getCapabilitiesResponse(requestId);
    }

    console.warn('[Router] 🧠 Routing vers Groq (question généraliste)');

    return await handleConversationalQuery(
      userMessage,
      projectCount,
      availableCollabs,
      availableStyles,
      conversationHistory,
      classification.isComplex || false,
      requestId
    );
  }

  // ========================================
  // ROUTING : Listing (0 DB, tout côté client)
  // ========================================
  // Ne traiter LIST que si ce n'est PAS un UPDATE (UPDATE a priorité)
  if ((classification.isList || classification.isCount) && !classification.isUpdate) {
    // Détecter une intention "vue détails" (via classification ou extraction fieldsToShow)
    const isDetailsViewRequested =
      classification.isDetailsViewRequested ||
      (fieldsToShow &&
        (fieldsToShow.includes('details') ||
          (fieldsToShow.includes('status') &&
            fieldsToShow.includes('progress') &&
            fieldsToShow.includes('deadline'))));

    // Détecter une demande explicite de "tous les projets"
    const isAllProjectsRequested = classification.isAllProjectsRequested;

    return handleListCommand(
      classification,
      filters,
      projects,
      context,
      fieldsToShow,
      requestId,
      isDetailsViewRequested,
      isAllProjectsRequested
    );
  }

  // ========================================
  // ROUTING : Création
  // ========================================
  if (classification.isCreate && !classification.isUpdate) {
    return handleCreateCommand(
      userMessage,
      lowerQuery,
      availableCollabs,
      availableStyles,
      requestId
    );
  }

  // ========================================
  // ROUTING : Modification via filtre (nécessite confirmation)
  // ========================================
  if (classification.isUpdate) {
    return handleUpdateCommand(
      userMessage,
      lowerQuery,
      filters,
      projects,
      context,
      availableCollabs,
      availableStyles,
      fieldsToShow,
      requestId
    );
  }

  // ========================================
  // FALLBACK : Question généraliste
  // ========================================
  console.warn('[Router] 🤖 Fallback vers Groq');

  // Utiliser isComplex de la classification pour le routing de modèle
  const isComplex = classification.isComplex || false;

  // Calculer isFirstAssistantTurn: vrai si pas d'historique conversationnel
  const isFirstAssistantTurn = !conversationHistory || conversationHistory.length === 0;

  const response = await callGroqApi(
    userMessage,
    {
      projectCount,
      collabCount: availableCollabs.length,
      styleCount: availableStyles.length,
    },
    conversationHistory,
    requestId,
    isComplex,
    isFirstAssistantTurn
  );

  return {
    type: ProjectCommandType.GENERAL,
    response,
    requestId,
  };
}
