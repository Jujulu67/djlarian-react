/**
 * Handler pour la modification de projets (Update)
 */

import type { Project, QueryFilters } from '@/lib/domain/projects';
import {
  ProjectCommandType,
  type ProjectCommandResult,
  type ProjectMutation,
  type PendingConfirmationAction,
  type RouterContext,
} from './types';
import { extractUpdateData } from '../../query-parser/updates';
import { detectFilters } from '../../query-parser/filters';
import { findNamedProject } from '../named-project';
import { debugLog, isAssistantDebugEnabled } from '../../utils/debug';
import {
  applyProjectFilterAndSort,
  isFilterEmpty,
  isScopingFilter,
  summarizeFilter,
  calculateAffectedProjects,
} from '../filter-helpers';
import {
  generateActionId,
  generateProjectPreviewDiff,
  buildActionDescription,
} from '../action-helpers';
import { logger } from '@/lib/logger';

type ScopeSource =
  | 'LastListedIds'
  | 'LastAppliedFilter'
  | 'AllProjects'
  | 'ExplicitFilter'
  | 'NamedProject';
type ExtractedUpdate = NonNullable<ReturnType<typeof extractUpdateData>>;

function proposedMutationOf(updateData: ExtractedUpdate) {
  return {
    newProgress: updateData.newProgress,
    newStatus: updateData.newStatus,
    newDeadline: updateData.newDeadline ?? undefined, // Convert null to undefined
    pushDeadlineBy: updateData.pushDeadlineBy,
    newCollab: updateData.newCollab,
    newStyle: updateData.newStyle,
    newLabel: updateData.newLabel,
    newLabelFinal: updateData.newLabelFinal,
    newNote: updateData.newNote,
  };
}

/** Projets visés : filtre explicite, sinon mémoire de travail. Null si le scope manque. */
function resolveScope(
  filters: QueryFilters,
  projects: Project[],
  context: RouterContext,
  updateData: ExtractedUpdate
): {
  scopeSource: ScopeSource;
  affectedProjects: Project[];
  effectiveFilters: QueryFilters;
} | null {
  // isScopingFilter plutôt que isFilterEmpty : hasDeadline seul ne délimite rien
  if (isScopingFilter(filters)) {
    return {
      scopeSource: 'ExplicitFilter',
      affectedProjects: calculateAffectedProjects(projects, filters),
      effectiveFilters: filters,
    };
  }

  const { lastListedProjectIds, lastAppliedFilter } = context;
  if (lastListedProjectIds && lastListedProjectIds.length > 0) {
    const affectedProjects = projects.filter((p) => lastListedProjectIds.includes(p.id));
    // Les projets listés n'existent plus : confirmation explicite, jamais de repli automatique
    if (affectedProjects.length === 0) return null;
    return { scopeSource: 'LastListedIds', affectedProjects, effectiveFilters: {} };
  }
  if (lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
    const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
    return {
      scopeSource: 'LastAppliedFilter',
      affectedProjects: filtered,
      effectiveFilters: lastAppliedFilter,
    };
  }
  // Note à un projet précis : pas besoin de scope, le projet sera cherché par nom
  if (updateData.projectName && updateData.newNote) {
    return {
      scopeSource: 'ExplicitFilter',
      affectedProjects: [],
      effectiveFilters: { name: updateData.projectName },
    };
  }
  return null;
}

/** Garde-fou : sans scope récent, on demande confirmation au lieu d'agir sur tout. */
function scopeMissingResult(
  updateData: ExtractedUpdate,
  totalProjectsCount: number,
  requestId?: string
): ProjectCommandResult {
  const proposedMutation = proposedMutationOf(updateData);
  const mutationDescription = buildActionDescription(
    ProjectCommandType.UPDATE,
    proposedMutation,
    totalProjectsCount,
    0
  );
  return {
    type: ProjectCommandType.GENERAL,
    confirmationType: 'scope_missing' as const,
    response: `Je n'ai pas de scope récent (aucun projet listé précédemment). Tu veux appliquer cette modification à tous les projets ?\n\n${mutationDescription}`,
    proposedMutation,
    totalProjectsCount,
    requestId,
  };
}

function noMatchResult(
  totalProjects: number,
  context: RouterContext,
  scopeSource: ScopeSource,
  effectiveFilters: QueryFilters,
  requestId?: string
): ProjectCommandResult {
  logger.warn('[Router] ⚠️ Aucun projet trouvé pour mutation', {
    scopeSource,
    projectsCount: totalProjects,
    effectiveFilter: summarizeFilter(effectiveFilters),
  });
  const effectiveFilterSummary = summarizeFilter(effectiveFilters);
  let response = isAssistantDebugEnabled()
    ? `Aucun projet ne correspond aux critères spécifiés.\n\n[Debug] Scope: ${scopeSource}, Filtre: ${JSON.stringify(effectiveFilterSummary)}, Total projets: ${totalProjects}`
    : 'Aucun projet ne correspond aux critères spécifiés.';
  if (!context.lastListedProjectIds?.length) {
    response =
      totalProjects === 0
        ? "Je n'ai trouvé aucun projet. Pouvez-vous préciser quels projets vous souhaitez modifier ?"
        : "Je n'ai pas pu identifier quels projets modifier. Pouvez-vous préciser ? (ex: 'pour les terminés', 'pour les projets en cours')";
  }
  return { type: ProjectCommandType.GENERAL, response, requestId };
}

/** updatedAt attendus pour la concurrence optimiste ; une date invalide est ignorée. */
function buildExpectedUpdatedAt(projects: Project[]): Record<string, string> {
  const expected: Record<string, string> = {};
  for (const project of projects) {
    const date = project.updatedAt ? new Date(project.updatedAt) : null;
    if (date && !isNaN(date.getTime())) expected[project.id] = date.toISOString();
  }
  return expected;
}

/**
 * Gère la modification de projets (Update)
 */
export function handleUpdateCommand(
  userMessage: string,
  lowerQuery: string,
  filters: QueryFilters,
  projects: Project[],
  context: RouterContext,
  availableCollabs: string[],
  availableStyles: string[],
  fieldsToShow?: string[],
  requestId?: string
): ProjectCommandResult {
  logger.warn('[Router] ✏️ Routing vers Modification (avec confirmation)');

  // Projet désigné par son nom : on l'analyse comme « le projet », sans les filtres
  // que son nom ou « à 40% » auraient produits, et on ne vise que lui
  const named = findNamedProject(userMessage, projects);
  if (named.kind === 'ambiguous') {
    return {
      type: ProjectCommandType.GENERAL,
      response: `${named.count} projets s'appellent « ${named.name} » : je ne sais pas lequel modifier. Renomme-les ou modifie-le depuis le tableau.`,
      requestId,
    };
  }
  const message = named.kind === 'found' ? named.rewrittenMessage : userMessage;
  const lowerMessage = named.kind === 'found' ? message.toLowerCase() : lowerQuery;
  const sourceFilters =
    named.kind === 'found'
      ? detectFilters(message, lowerMessage, availableCollabs, availableStyles).filters
      : filters;

  // Passer une copie des filtres pour éviter les effets de bord (modification in-place)
  // Utiliser JSON.parse/stringify pour un deep clone sûr car filters peut contenir des objets
  const filtersCopy = JSON.parse(JSON.stringify(sourceFilters)) as Record<string, unknown>;
  const updateData = extractUpdateData(message, lowerMessage, filtersCopy, availableStyles);

  // Logs pour UPDATE (debug)
  debugLog('router', '📝 ExtractedUpdateData', {
    mutation: {
      newStatus: updateData?.newStatus,
      newProgress: updateData?.newProgress,
      newDeadline: updateData?.newDeadline ? String(updateData.newDeadline) : undefined,
      pushDeadlineBy: updateData?.pushDeadlineBy,
      newCollab: updateData?.newCollab,
      newStyle: updateData?.newStyle,
      newNote: updateData?.newNote,
    },
    extractedFilter: summarizeFilter(filters),
    hasDeadlineIntent: /deadline|date\s*limite/i.test(userMessage),
  });

  if (!updateData) {
    debugLog('router', '❌ UPDATE: extractUpdateData a retourné null');
    return {
      type: ProjectCommandType.GENERAL,
      response: "Je n'ai pas pu comprendre quelle modification effectuer. Pouvez-vous reformuler ?",
      requestId,
    };
  }

  const scope =
    named.kind === 'found'
      ? {
          scopeSource: 'NamedProject' as const,
          affectedProjects: [named.project],
          effectiveFilters: { name: named.project.name } as QueryFilters,
        }
      : resolveScope(filters, projects, context, updateData);
  if (!scope) return scopeMissingResult(updateData, projects.length, requestId);
  const { scopeSource, effectiveFilters } = scope;
  let { affectedProjects } = scope;

  // Logs du scope choisi (debug)
  debugLog('router', '🎯 Scope choisi', {
    scopeSource,
    scopeCount: affectedProjects.length,
    effectiveFilter: summarizeFilter(effectiveFilters),
    lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
    lastAppliedFilterSummary: summarizeFilter(context.lastAppliedFilter),
  });

  // Pour les mutations de deadline (pushDeadlineBy ou newDeadline), filtrer les projets sans deadline
  const isDeadlineMutation = !!(updateData.pushDeadlineBy || updateData.newDeadline);
  let skippedNoDeadlineCount = 0;
  if (isDeadlineMutation) {
    const beforeCount = affectedProjects.length;
    affectedProjects = affectedProjects.filter(
      (p) => p.deadline !== null && p.deadline !== undefined
    );
    skippedNoDeadlineCount = beforeCount - affectedProjects.length;
    if (skippedNoDeadlineCount > 0) {
      debugLog('router', '⏭️ SkippedNoDeadline', {
        skippedCount: skippedNoDeadlineCount,
        beforeCount,
        afterCount: affectedProjects.length,
      });
    }
  }

  // Si c'est un ajout de note à un projet spécifique (projectName + newNote),
  // on ne vérifie pas affectedProjects.length car le projet sera trouvé par nom plus tard
  const isSpecificProjectNote = !!(updateData.projectName && updateData.newNote);

  if (affectedProjects.length === 0 && !isSpecificProjectNote) {
    return noMatchResult(projects.length, context, scopeSource, effectiveFilters, requestId);
  }

  // Construire la mutation
  const mutation: ProjectMutation = {
    newStatus: updateData.newStatus,
    newDeadline: updateData.newDeadline || undefined,
    pushDeadlineBy: updateData.pushDeadlineBy,
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

  // Générer previewDiff pour les 3 premiers projets
  // Pour un ajout de note à un projet spécifique, on n'a pas besoin de previewDiff
  // car le projet sera trouvé par nom plus tard
  const previewDiff = isSpecificProjectNote
    ? []
    : affectedProjects.slice(0, 3).map((project) => generateProjectPreviewDiff(project, mutation));

  // Construire expectedUpdatedAtById pour vérification concurrency optimiste
  // Seulement si on a des projets avec updatedAt valide
  const expectedUpdatedAtById = buildExpectedUpdatedAt(affectedProjects);

  // Logs de debug pour la construction de expectedUpdatedAtById
  if (isAssistantDebugEnabled() && Object.keys(expectedUpdatedAtById).length > 0) {
    debugLog('router', '🔍 expectedUpdatedAtById construit', {
      totalProjects: affectedProjects.length,
      projectsWithUpdatedAt: Object.keys(expectedUpdatedAtById).length,
      sample: Object.entries(expectedUpdatedAtById)
        .slice(0, 3)
        .map(([id, updatedAt]) => ({
          id,
          updatedAt,
          projectName: affectedProjects.find((p) => p.id === id)?.name,
        })),
    });
  }

  const pendingAction: PendingConfirmationAction = {
    actionId: generateActionId(),
    type: actionType,
    filters: effectiveFilters,
    mutation,
    affectedProjects,
    affectedProjectIds: Array.from(new Set(affectedProjects.map((p) => p.id))), // Dédoublonnage en défense en profondeur
    scopeSource,
    fieldsToShow: fieldsToShowForConfirmation,
    description: buildActionDescription(
      actionType,
      mutation,
      affectedProjects.length,
      skippedNoDeadlineCount
    ),
    requestId,
    previewDiff: previewDiff.length > 0 ? previewDiff : undefined,
    expectedUpdatedAtById:
      Object.keys(expectedUpdatedAtById).length > 0 ? expectedUpdatedAtById : undefined,
  };

  return {
    type: actionType,
    pendingAction,
    message: `${pendingAction.description}. Confirmez-vous cette action ?`,
    requestId,
  };
}
