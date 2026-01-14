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
import { debugLog, isAssistantDebugEnabled } from '../../utils/debug';
import { sanitizeObjectForLogs } from '../../utils/sanitize-logs';
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
  console.warn('[Router] ✏️ Routing vers Modification (avec confirmation)');

  // Passer une copie des filtres pour éviter les effets de bord (modification in-place)
  // Utiliser JSON.parse/stringify pour un deep clone sûr car filters peut contenir des objets
  const filtersCopy = JSON.parse(JSON.stringify(filters)) as Record<string, unknown>;
  const updateData = extractUpdateData(userMessage, lowerQuery, filtersCopy, availableStyles);

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

  // Détecter si un filtre scoping explicite est présent
  // Utiliser isScopingFilter au lieu de isFilterEmpty pour ignorer hasDeadline seul
  const hasExplicitScopingFilter = isScopingFilter(filters);

  let affectedProjects: Project[];
  let effectiveFilters: QueryFilters;
  let scopeSource: 'LastListedIds' | 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter';

  if (!hasExplicitScopingFilter) {
    // Pas de filtre explicite : utiliser la mémoire de travail
    const { lastListedProjectIds, lastAppliedFilter } = context;

    if (lastListedProjectIds && lastListedProjectIds.length > 0) {
      // Priorité 1 : Utiliser les IDs du dernier listing
      console.warn('[Router] ✏️ UPDATE sans filtre explicite → scope = last listing (IDs)');
      scopeSource = 'LastListedIds';
      affectedProjects = projects.filter((p) => lastListedProjectIds.includes(p.id));
      effectiveFilters = {}; // Pas de filtre, on utilise les IDs
    } else if (lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
      // Priorité 2 : Utiliser le dernier filtre appliqué
      console.warn('[Router] ✏️ UPDATE sans filtre explicite → scope = last filter');
      scopeSource = 'LastAppliedFilter';
      const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
      affectedProjects = filtered;
      effectiveFilters = lastAppliedFilter;
    } else {
      // CAS SPÉCIAL : Ajout de note à un projet spécifique (projectName + newNote)
      // Dans ce cas, on n'a pas besoin de scope - on cherche directement le projet par nom
      if (updateData.projectName && updateData.newNote) {
        console.warn(
          '[Router] ✏️ Ajout de note à projet spécifique → bypass garde-fou, recherche par nom'
        );
        // On va continuer avec affectedProjects vide, le projet sera trouvé par nom plus tard
        scopeSource = 'ExplicitFilter'; // Utiliser ExplicitFilter pour indiquer qu'on a un projet spécifique
        affectedProjects = []; // Sera rempli lors de la recherche par nom
        effectiveFilters = { name: updateData.projectName };
      } else {
        // GARDE-FOU : Pas de scope récent, demander confirmation explicite au lieu de fallback automatique
        // Construire un résumé détaillé pour le warning
        const mutationSummary = {
          newProgress: updateData.newProgress,
          newStatus: updateData.newStatus,
          newDeadline: updateData.newDeadline ? String(updateData.newDeadline) : undefined,
          pushDeadlineBy: updateData.pushDeadlineBy,
          newCollab: updateData.newCollab,
          newStyle: updateData.newStyle,
          newLabel: updateData.newLabel,
          newLabelFinal: updateData.newLabelFinal,
          newNote: updateData.newNote,
        };

        // Sanitizer les données avant de logger
        const sanitizedLogData = sanitizeObjectForLogs({
          userMessage: userMessage,
          lastListedProjectIdsCount: lastListedProjectIds?.length || 0,
          projectsCount: projects.length,
          hasLastAppliedFilter: !!lastAppliedFilter,
          lastAppliedFilterSummary: summarizeFilter(lastAppliedFilter || {}),
          mutationSummary,
        });

        console.warn('[Router] ⚠️ GARDE-FOU: Pas de scope récent pour mutation', sanitizedLogData);

        // Demander confirmation explicite au lieu de fallback automatique
        const mutationDescription = buildActionDescription(
          ProjectCommandType.UPDATE,
          {
            newProgress: updateData.newProgress,
            newStatus: updateData.newStatus,
            newDeadline: updateData.newDeadline ?? undefined, // Convert null to undefined
            pushDeadlineBy: updateData.pushDeadlineBy,
            newCollab: updateData.newCollab,
            newStyle: updateData.newStyle,
            newLabel: updateData.newLabel,
            newLabelFinal: updateData.newLabelFinal,
            newNote: updateData.newNote,
          },
          projects.length,
          0
        );

        return {
          type: ProjectCommandType.GENERAL,
          confirmationType: 'scope_missing' as const,
          response: `Je n'ai pas de scope récent (aucun projet listé précédemment). Tu veux appliquer cette modification à tous les projets ?\n\n${mutationDescription}`,
          proposedMutation: {
            newProgress: updateData.newProgress,
            newStatus: updateData.newStatus,
            newDeadline: updateData.newDeadline ?? undefined,
            pushDeadlineBy: updateData.pushDeadlineBy,
            newCollab: updateData.newCollab,
            newStyle: updateData.newStyle,
            newLabel: updateData.newLabel,
            newLabelFinal: updateData.newLabelFinal,
            newNote: updateData.newNote,
          },
          totalProjectsCount: projects.length,
          requestId,
        };
      }
    }
  } else {
    // Filtre scoping explicite présent : l'utiliser (ignore le working set)
    console.warn(
      '[Router] ✏️ UPDATE avec filtre scoping explicite → scope = filtre de la commande'
    );
    // D'abord, vérifier si un filtre explicite est fourni dans la commande actuelle
    scopeSource = 'ExplicitFilter';
    affectedProjects = calculateAffectedProjects(projects, filters);
    effectiveFilters = filters;
  }

  // ========================================
  // GARDE-FOU : Vérifier la cohérence du scope choisi
  // ========================================
  // Si scopeSource === LastListedIds mais qu'il n'y a pas d'IDs ou de projets affectés,
  // demander confirmation explicite à l'utilisateur au lieu de fallback automatique
  if (scopeSource === 'LastListedIds') {
    const { lastListedProjectIds } = context;
    if (
      !lastListedProjectIds ||
      lastListedProjectIds.length === 0 ||
      affectedProjects.length === 0
    ) {
      // Construire un résumé détaillé pour le warning
      const mutationSummary = {
        newProgress: updateData.newProgress,
        newStatus: updateData.newStatus,
        newDeadline: updateData.newDeadline ? String(updateData.newDeadline) : undefined,
        pushDeadlineBy: updateData.pushDeadlineBy,
        newCollab: updateData.newCollab,
        newStyle: updateData.newStyle,
        newLabel: updateData.newLabel,
        newLabelFinal: updateData.newLabelFinal,
        newNote: updateData.newNote,
      };

      // Sanitizer les données avant de logger
      const sanitizedGuardrailLogData = sanitizeObjectForLogs({
        userMessage: userMessage,
        lastListedProjectIdsCount: lastListedProjectIds?.length || 0,
        projectsCount: projects.length,
        affectedProjectsLength: affectedProjects.length,
        mutationSummary,
        context: {
          hasLastAppliedFilter: !!context.lastAppliedFilter,
          lastAppliedFilterSummary: summarizeFilter(context.lastAppliedFilter || {}),
        },
      });

      console.warn(
        '[Router] ⚠️ GARDE-FOU: LastListedIds choisi mais lastListedProjectIds est vide ou aucun projet trouvé',
        sanitizedGuardrailLogData
      );

      // Au lieu de fallback automatique, demander confirmation explicite
      const mutationDescription = buildActionDescription(
        ProjectCommandType.UPDATE,
        {
          newProgress: updateData.newProgress,
          newStatus: updateData.newStatus,
          newDeadline: updateData.newDeadline ?? undefined, // Convert null to undefined
          pushDeadlineBy: updateData.pushDeadlineBy,
          newCollab: updateData.newCollab,
          newStyle: updateData.newStyle,
          newLabel: updateData.newLabel,
          newLabelFinal: updateData.newLabelFinal,
          newNote: updateData.newNote,
        },
        projects.length,
        0
      );

      return {
        type: ProjectCommandType.GENERAL,
        confirmationType: 'scope_missing' as const,
        response: `Je n'ai pas de scope récent (aucun projet listé précédemment). Tu veux appliquer cette modification à tous les projets ?\n\n${mutationDescription}`,
        proposedMutation: {
          newProgress: updateData.newProgress,
          newStatus: updateData.newStatus,
          newDeadline: updateData.newDeadline ?? undefined,
          pushDeadlineBy: updateData.pushDeadlineBy,
          newCollab: updateData.newCollab,
          newStyle: updateData.newStyle,
          newLabel: updateData.newLabel,
          newLabelFinal: updateData.newLabelFinal,
          newNote: updateData.newNote,
        },
        totalProjectsCount: projects.length,
        requestId,
      };
    }
  }

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
    // Cas spécial : Si on arrive ici avec aucun projet trouvé et qu'il n'y a pas de scope récent,
    // demander clarification à l'utilisateur.
    // Note: scopeSource ne peut pas être 'AllProjects' ici car le garde-fou retourne déjà dans ce cas
    if (!context.lastListedProjectIds || context.lastListedProjectIds.length === 0) {
      // Construire un résumé détaillé pour le warning
      const mutationSummary = {
        newProgress: updateData.newProgress,
        newStatus: updateData.newStatus,
        newDeadline: updateData.newDeadline ? String(updateData.newDeadline) : undefined,
        pushDeadlineBy: updateData.pushDeadlineBy,
        newCollab: updateData.newCollab,
        newStyle: updateData.newStyle,
        newLabel: updateData.newLabel,
        newLabelFinal: updateData.newLabelFinal,
        newNote: updateData.newNote,
      };

      // Sanitizer les données avant de logger
      const sanitizedEdgeCaseLogData = sanitizeObjectForLogs({
        userMessage: userMessage,
        scopeSource,
        lastListedProjectIdsCount: 0,
        projectsCount: projects.length,
        mutationSummary,
        effectiveFilter: summarizeFilter(effectiveFilters),
      });

      console.warn(
        '[Router] ⚠️ Aucun projet trouvé - pas de scope récent',
        sanitizedEdgeCaseLogData
      );

      // Le garde-fou a fait un fallback mais il n'y a toujours aucun projet
      // (peut arriver si projects.length === 0, ce qui est un cas edge)
      const errorMessage =
        projects.length === 0
          ? "Je n'ai trouvé aucun projet. Pouvez-vous préciser quels projets vous souhaitez modifier ?"
          : "Je n'ai pas pu identifier quels projets modifier. Pouvez-vous préciser ? (ex: 'pour les terminés', 'pour les projets en cours')";

      return {
        type: ProjectCommandType.GENERAL,
        response: errorMessage,
        requestId,
      };
    }

    // Construire un résumé détaillé pour le warning
    const mutationSummary = {
      newProgress: updateData.newProgress,
      newStatus: updateData.newStatus,
      newDeadline: updateData.newDeadline ? String(updateData.newDeadline) : undefined,
      pushDeadlineBy: updateData.pushDeadlineBy,
      newCollab: updateData.newCollab,
      newStyle: updateData.newStyle,
      newLabel: updateData.newLabel,
      newLabelFinal: updateData.newLabelFinal,
      newNote: updateData.newNote,
    };

    // Logs détaillés pour comprendre pourquoi aucun match (debug) - Sanitizer les données
    const sanitizedDebugData = sanitizeObjectForLogs({
      userMessage: userMessage,
      scopeSource,
      effectiveFilter: summarizeFilter(effectiveFilters),
      totalProjects: projects.length,
      lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
      mutationSummary,
      sampleProjects: projects.slice(0, 3).map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
      })),
    });

    debugLog('router', '❌ WhyNoMatch', sanitizedDebugData);

    // Warning détaillé pour production - Sanitizer les données
    const sanitizedNoMatchLogData = sanitizeObjectForLogs({
      userMessage: userMessage,
      scopeSource,
      lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
      projectsCount: projects.length,
      mutationSummary,
      effectiveFilter: summarizeFilter(effectiveFilters),
    });

    console.warn('[Router] ⚠️ Aucun projet trouvé pour mutation', sanitizedNoMatchLogData);

    // Message d'erreur avec détails en mode debug
    const effectiveFilterSummary = summarizeFilter(effectiveFilters);
    const errorMessage = isAssistantDebugEnabled()
      ? `Aucun projet ne correspond aux critères spécifiés.\n\n[Debug] Scope: ${scopeSource}, Filtre: ${JSON.stringify(effectiveFilterSummary)}, Total projets: ${projects.length}`
      : 'Aucun projet ne correspond aux critères spécifiés.';

    return {
      type: ProjectCommandType.GENERAL,
      response: errorMessage,
      requestId,
    };
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
  const expectedUpdatedAtById: Record<string, string> = {};
  for (const project of affectedProjects) {
    if (project.updatedAt) {
      // updatedAt est toujours une string dans le type Project
      // S'assurer que c'est au format ISO et valide
      let updatedAt: string;
      if (typeof project.updatedAt === 'string') {
        // Vérifier que c'est un format ISO valide
        const date = new Date(project.updatedAt);
        if (isNaN(date.getTime())) {
          // Date invalide, logger et ignorer
          debugLog('router', '⚠️ updatedAt invalide ignoré', {
            projectId: project.id,
            projectName: project.name,
            updatedAt: project.updatedAt,
          });
          continue;
        }
        updatedAt = date.toISOString();
      } else {
        // Si c'est un objet Date, le convertir
        const date = new Date(project.updatedAt);
        if (isNaN(date.getTime())) {
          debugLog('router', '⚠️ updatedAt invalide ignoré', {
            projectId: project.id,
            projectName: project.name,
            updatedAt: project.updatedAt,
          });
          continue;
        }
        updatedAt = date.toISOString();
      }
      expectedUpdatedAtById[project.id] = updatedAt;
    }
    // Si updatedAt est null/undefined, on ne l'inclut pas (sera considéré comme conflit côté serveur)
  }

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
