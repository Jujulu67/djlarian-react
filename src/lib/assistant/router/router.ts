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

import type { Project } from '@/components/projects/types';
import type { QueryFilters } from '@/components/assistant/types';
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
import { extractUpdateData } from '../query-parser/updates';
import { extractCreateData } from '../query-parser/creates';
import { filterProjects } from '@/components/assistant/utils/filterProjects';
import { getConversationalResponse } from '../conversational/groq-responder';
import { debugLog, debugLogObject, isAssistantDebugEnabled } from '../utils/debug';

/**
 * Applique les filtres et le tri sur les projets en mémoire (0 DB)
 */
function applyProjectFilterAndSort(
  projects: Project[],
  filter: ProjectFilter
): { filtered: Project[]; count: number } {
  // Appliquer les filtres
  const filterResult = filterProjects(projects, filter);
  let filtered = filterResult.filtered;

  // Appliquer le tri
  if (filter.sortBy) {
    filtered = [...filtered].sort((a, b) => {
      const aValue = a[filter.sortBy!];
      const bValue = b[filter.sortBy!];

      // Gérer les valeurs null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Comparaison selon le type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return filter.sortDirection === 'desc' ? -comparison : comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filter.sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime();
        return filter.sortDirection === 'desc' ? -comparison : comparison;
      }

      return 0;
    });
  }

  return { filtered, count: filtered.length };
}

/**
 * Calcule la liste des projets impactés par une mutation via filtre
 */
function calculateAffectedProjects(projects: Project[], filters: QueryFilters): Project[] {
  const filterResult = filterProjects(projects, filters);
  return filterResult.filtered;
}

/**
 * Vérifie si un filtre est vide ou non significatif (aucun critère de filtrage réel)
 * Gère les cas : undefined, null, chaînes vides, tableaux vides
 */
function isFilterEmpty(filter: QueryFilters | ProjectFilter | undefined | null): boolean {
  if (!filter) {
    return true;
  }

  // Vérifier chaque propriété : doit être absente, undefined, null, ou chaîne vide
  const hasStatus = filter.status !== undefined && filter.status !== null && filter.status !== '';
  const hasMinProgress = filter.minProgress !== undefined && filter.minProgress !== null;
  const hasMaxProgress = filter.maxProgress !== undefined && filter.maxProgress !== null;
  const hasCollab = filter.collab !== undefined && filter.collab !== null && filter.collab !== '';
  const hasStyle = filter.style !== undefined && filter.style !== null && filter.style !== '';
  const hasLabel = filter.label !== undefined && filter.label !== null && filter.label !== '';
  const hasDeadline = filter.hasDeadline !== undefined && filter.hasDeadline !== null;
  const hasName = filter.name !== undefined && filter.name !== null && filter.name !== '';
  const hasNoProgress = filter.noProgress !== undefined && filter.noProgress !== null;
  const hasYear = 'year' in filter && filter.year !== undefined && filter.year !== null;

  // Vérifier aussi sortBy et sortDirection (pour ProjectFilter)
  const hasSortBy = 'sortBy' in filter && filter.sortBy !== undefined && filter.sortBy !== null;
  const hasSortDirection =
    'sortDirection' in filter &&
    filter.sortDirection !== undefined &&
    filter.sortDirection !== null;

  return (
    !hasStatus &&
    !hasMinProgress &&
    !hasMaxProgress &&
    !hasCollab &&
    !hasStyle &&
    !hasLabel &&
    !hasDeadline &&
    !hasName &&
    !hasNoProgress &&
    !hasYear &&
    !hasSortBy &&
    !hasSortDirection
  );
}

/**
 * Résume un filtre pour les logs (affiche seulement les propriétés non vides)
 */
function summarizeFilter(
  filter: QueryFilters | ProjectFilter | undefined | null
): Record<string, any> {
  if (!filter) {
    return { empty: true };
  }

  const summary: Record<string, any> = {};
  if (filter.status) summary.status = filter.status;
  if (filter.minProgress !== undefined) summary.minProgress = filter.minProgress;
  if (filter.maxProgress !== undefined) summary.maxProgress = filter.maxProgress;
  if (filter.collab) summary.collab = filter.collab;
  if (filter.style) summary.style = filter.style;
  if (filter.label) summary.label = filter.label;
  if (filter.hasDeadline !== undefined) summary.hasDeadline = filter.hasDeadline;
  if (filter.name) summary.name = filter.name;
  if (filter.noProgress !== undefined) summary.noProgress = filter.noProgress;
  if ('year' in filter && filter.year !== undefined) summary.year = filter.year;
  if ('sortBy' in filter && filter.sortBy) summary.sortBy = filter.sortBy;
  if ('sortDirection' in filter && filter.sortDirection)
    summary.sortDirection = filter.sortDirection;

  return Object.keys(summary).length === 0 ? { empty: true } : summary;
}

/**
 * Génère un ID unique pour une action en attente
 */
function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Construit une description lisible de l'action
 */
function buildActionDescription(
  type: ProjectCommandType.UPDATE | ProjectCommandType.ADD_NOTE,
  mutation: ProjectMutation,
  affectedCount: number
): string {
  if (type === ProjectCommandType.ADD_NOTE) {
    if (mutation.projectName) {
      return `Ajouter une note au projet "${mutation.projectName}"`;
    }
    return `Ajouter une note à ${affectedCount} projet(s)`;
  }

  // Type UPDATE
  const changes: string[] = [];
  if (mutation.newStatus) changes.push(`statut → ${mutation.newStatus}`);
  if (mutation.newDeadline) changes.push(`deadline → ${mutation.newDeadline}`);
  if (mutation.newProgress !== undefined) changes.push(`progression → ${mutation.newProgress}%`);
  if (mutation.newCollab) changes.push(`collab → ${mutation.newCollab}`);
  if (mutation.newStyle) changes.push(`style → ${mutation.newStyle}`);

  return `Modifier ${affectedCount} projet(s) : ${changes.join(', ')}`;
}

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
  const { context, conversationHistory, lastFilters } = options;
  const { projects, availableCollabs, availableStyles, projectCount } = context;

  // Logs d'entrée (debug)
  debugLog('router', '📥 Entrée du routeur', {
    message: userMessage.substring(0, 100), // Limiter la taille pour les logs
    projectsCount: projects.length,
    lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
    lastAppliedFilter: summarizeFilter(context.lastAppliedFilter),
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
  // ROUTING : Question généraliste → Groq (lecture seule)
  // ========================================
  if (classification.isConversationalQuestion && !classification.hasActionVerb) {
    console.log('[Router] 🧠 Routing vers Groq (question généraliste)');

    const response = await getConversationalResponse(
      userMessage,
      {
        projectCount,
        collabCount: availableCollabs.length,
        styleCount: availableStyles.length,
      },
      conversationHistory
    );

    return {
      type: ProjectCommandType.GENERAL,
      response,
    };
  }

  // ========================================
  // ROUTING : Listing (0 DB, tout côté client)
  // ========================================
  if (classification.isList || classification.isCount) {
    console.log('[Router] 📋 Routing vers Listing (côté client)');

    const projectFilter: ProjectFilter = {
      ...filters,
      // TODO: Détecter sortBy et sortDirection depuis la requête si nécessaire
    };

    const { filtered, count } = applyProjectFilterAndSort(projects, projectFilter);

    const message =
      classification.isCount && !classification.isList
        ? `Vous avez ${count} projet(s).`
        : count === 0
          ? "Je n'ai trouvé aucun projet correspondant."
          : `J'ai trouvé ${count} projet(s).`;

    return {
      type: ProjectCommandType.LIST,
      projects: filtered,
      count,
      fieldsToShow: fieldsToShow || ['progress', 'status', 'deadline'],
      message,
      appliedFilter: projectFilter,
      listedProjectIds: filtered.map((p) => p.id),
    };
  }

  // ========================================
  // ROUTING : Création
  // ========================================
  if (classification.isCreate && !classification.isUpdate) {
    console.log('[Router] ➕ Routing vers Création');

    const createData = extractCreateData(userMessage, lowerQuery, filters as any, availableStyles);

    if (!createData || !createData.name) {
      return {
        type: ProjectCommandType.GENERAL,
        response: "Je n'ai pas pu extraire le nom du projet à créer. Pouvez-vous reformuler ?",
      };
    }

    // La création nécessite un appel serveur pour persister
    // On retourne les données de création qui seront utilisées par le hook
    // pour appeler l'API de création
    return {
      type: ProjectCommandType.CREATE,
      project: {
        // Structure minimale pour indiquer la création
        // Le vrai projet sera créé côté serveur via l'API
        id: 'pending',
        name: createData.name,
        status: (createData.status as any) || 'EN_COURS',
        progress: createData.progress || null,
        collab: createData.collab || null,
        style: createData.style || null,
        deadline: createData.deadline || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: 0,
        userId: '',
        label: null,
        labelFinal: null,
        releaseDate: null,
        externalLink: null,
        streamsJ7: null,
        streamsJ14: null,
        streamsJ21: null,
        streamsJ28: null,
        streamsJ56: null,
        streamsJ84: null,
        streamsJ180: null,
        streamsJ365: null,
        note: null,
      } as Project,
      message: `Création du projet "${createData.name}" en cours...`,
      createData, // Inclure les données brutes pour l'API
    };
  }

  // ========================================
  // ROUTING : Modification via filtre (nécessite confirmation)
  // ========================================
  if (classification.isUpdate) {
    console.log('[Router] ✏️ Routing vers Modification (avec confirmation)');

    const updateData = extractUpdateData(userMessage, lowerQuery, filters, availableStyles);

    // Logs pour UPDATE (debug)
    debugLog('router', '📝 ExtractedUpdateData', {
      mutation: {
        newStatus: updateData?.newStatus,
        newProgress: updateData?.newProgress,
        newDeadline: updateData?.newDeadline ? String(updateData.newDeadline) : undefined,
        newCollab: updateData?.newCollab,
        newStyle: updateData?.newStyle,
        newNote: updateData?.newNote,
      },
      extractedFilter: summarizeFilter(filters),
    });

    if (!updateData) {
      debugLog('router', '❌ UPDATE: extractUpdateData a retourné null');
      return {
        type: ProjectCommandType.GENERAL,
        response:
          "Je n'ai pas pu comprendre quelle modification effectuer. Pouvez-vous reformuler ?",
      };
    }

    // Détecter si un filtre explicite est présent
    const hasExplicitFilter = !isFilterEmpty(filters);
    const filterSummary = summarizeFilter(filters);
    const filterKeys = Object.keys(filterSummary).filter((k) => k !== 'empty');
    const filterEmptyReason = isFilterEmpty(filters)
      ? 'filtre vide (toutes les propriétés sont undefined/null/vides)'
      : `filtre contient: ${filterKeys.join(', ')}`;

    debugLog('router', '🔍 HasExplicitFilter', {
      hasExplicitFilter,
      reason: hasExplicitFilter
        ? `explicite car ${filterEmptyReason.replace('filtre vide', 'filtre non vide')}`
        : `non explicite car ${filterEmptyReason}`,
      filterSummary: summarizeFilter(filters),
    });

    // Calculer les projets impactés selon la mémoire de travail
    let affectedProjects: Project[];
    let effectiveFilters: QueryFilters;
    let scopeSource: 'LastListedIds' | 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter';

    if (!hasExplicitFilter) {
      // Pas de filtre explicite : utiliser la mémoire de travail
      const { lastListedProjectIds, lastAppliedFilter } = context;

      if (lastListedProjectIds && lastListedProjectIds.length > 0) {
        // Priorité 1 : Utiliser les IDs du dernier listing
        console.log('[Router] ✏️ UPDATE sans filtre explicite → scope = last listing (IDs)');
        scopeSource = 'LastListedIds';
        affectedProjects = projects.filter((p) => lastListedProjectIds.includes(p.id));
        effectiveFilters = {}; // Pas de filtre, on utilise les IDs
      } else if (lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
        // Priorité 2 : Utiliser le dernier filtre appliqué
        console.log('[Router] ✏️ UPDATE sans filtre explicite → scope = last filter');
        scopeSource = 'LastAppliedFilter';
        const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
        affectedProjects = filtered;
        effectiveFilters = lastAppliedFilter;
      } else {
        // Fallback : tous les projets (avec avertissement)
        console.log(
          '[Router] ⚠️ UPDATE sans filtre explicite et sans historique → scope = tous les projets'
        );
        scopeSource = 'AllProjects';
        affectedProjects = projects;
        effectiveFilters = {};
      }
    } else {
      // Filtre explicite présent : l'utiliser (ignore le working set)
      console.log('[Router] ✏️ UPDATE avec filtre explicite → scope = filtre de la commande');
      scopeSource = 'ExplicitFilter';
      affectedProjects = calculateAffectedProjects(projects, filters);
      effectiveFilters = filters;
    }

    // Logs du scope choisi (debug)
    debugLog('router', '🎯 Scope choisi', {
      scopeSource,
      scopeCount: affectedProjects.length,
      effectiveFilter: summarizeFilter(effectiveFilters),
      lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
      lastAppliedFilterSummary: summarizeFilter(context.lastAppliedFilter),
    });

    if (affectedProjects.length === 0) {
      // Logs détaillés pour comprendre pourquoi aucun match (debug)
      debugLog('router', '❌ WhyNoMatch', {
        scopeSource,
        effectiveFilter: summarizeFilter(effectiveFilters),
        totalProjects: projects.length,
        sampleProjects: projects.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          progress: p.progress,
        })),
      });

      // Message d'erreur avec détails en mode debug
      const effectiveFilterSummary = summarizeFilter(effectiveFilters);
      const errorMessage = isAssistantDebugEnabled()
        ? `Aucun projet ne correspond aux critères spécifiés.\n\n[Debug] Scope: ${scopeSource}, Filtre: ${JSON.stringify(effectiveFilterSummary)}, Total projets: ${projects.length}`
        : 'Aucun projet ne correspond aux critères spécifiés.';

      return {
        type: ProjectCommandType.GENERAL,
        response: errorMessage,
      };
    }

    // Construire la mutation
    const mutation: ProjectMutation = {
      newStatus: updateData.newStatus,
      newDeadline: updateData.newDeadline || undefined,
      newProgress: updateData.newProgress,
      newCollab: updateData.newCollab,
      newStyle: updateData.newStyle,
      newLabel: updateData.newLabel,
      newLabelFinal: updateData.newLabelFinal,
      newNote: updateData.newNote,
      projectName: updateData.projectName,
    };

    // Détecter si c'est une note (projet spécifique ou via filtre)
    const isNoteAction = !!(
      mutation.newNote &&
      (mutation.projectName || affectedProjects.length > 0)
    );

    const actionType = isNoteAction ? ProjectCommandType.ADD_NOTE : ProjectCommandType.UPDATE;

    // Utiliser les champs du dernier listing si disponibles, sinon par défaut
    const fieldsToShowForConfirmation = fieldsToShow || ['progress', 'status', 'deadline'];

    const pendingAction: PendingConfirmationAction = {
      actionId: generateActionId(),
      type: actionType,
      filters: effectiveFilters,
      mutation,
      affectedProjects,
      affectedProjectIds: affectedProjects.map((p) => p.id),
      scopeSource,
      fieldsToShow: fieldsToShowForConfirmation,
      description: buildActionDescription(actionType, mutation, affectedProjects.length),
    };

    return {
      type: actionType,
      pendingAction,
      message: `${pendingAction.description}. Confirmez-vous cette action ?`,
    };
  }

  // ========================================
  // FALLBACK : Question généraliste
  // ========================================
  console.log('[Router] 🤖 Fallback vers Groq');

  const response = await getConversationalResponse(
    userMessage,
    {
      projectCount,
      collabCount: availableCollabs.length,
      styleCount: availableStyles.length,
    },
    conversationHistory
  );

  return {
    type: ProjectCommandType.GENERAL,
    response,
  };
}
