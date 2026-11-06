'use client';

/**
 * Handler for update confirmation logic
 * Handles both note addition and bulk batch updates
 */
import type { Project } from '@/components/projects/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { Message, QueryFilters, UpdateData } from '../types';
import { debugLogObject, isAssistantDebugEnabled } from '@/lib/assistant/utils/debug';
import { logger } from '@/lib/logger';

interface HandleConfirmUpdateParams {
  msg: Message;
  idx: number;
  router: AppRouterInstance;
  setIsLoading: (loading: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setLocalProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  localProjectsRef: React.MutableRefObject<Project[]>;
  setLastFilters: React.Dispatch<React.SetStateAction<QueryFilters | null>>;
}

type UpdateConfirmation = NonNullable<Message['updateConfirmation']>;

/** Cas particulier : ajouter une note à un projet précis. */
async function addNoteToProject({ msg, router, setMessages }: HandleConfirmUpdateParams) {
  const updateData = msg.updateConfirmation!.updateData;
  const notePayload = {
    projectName: updateData.projectName,
    newNote: updateData.newNote,
  };

  const response = await fetch('/api/projects/add-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notePayload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erreur lors de l'ajout de la note");
  }

  const result = await response.json();
  const successMessage = result.data?.message || result.message || 'Note ajoutée avec succès.';

  setMessages((prev) => [
    ...prev,
    { role: 'assistant', content: successMessage, timestamp: new Date() },
  ]);

  // Dispatch event for ProjectsClient
  const projectId = result.data?.projectId || msg.updateConfirmation!.affectedProjects[0]?.id;
  if (projectId) {
    // La note est enregistrée (réponse reçue) : prévenir la page projets tout de suite
    window.dispatchEvent(
      new CustomEvent('projectsUpdatedFromAssistant', {
        detail: { projectIds: [projectId], updates: { note: true } },
      })
    );
  }

  router.refresh();

  // Mark message as processed
  setMessages((prev) => prev.map((m) => (m === msg ? { ...m, updateConfirmation: undefined } : m)));
}

function copyDefined<T extends object>(
  target: Record<string, unknown>,
  source: T,
  keys: (keyof T & string)[]
): void {
  for (const key of keys) {
    if (source[key] !== undefined) target[key] = source[key];
  }
}

function copyTruthy<T extends object>(
  target: Record<string, unknown>,
  source: T,
  keys: (keyof T & string)[]
): void {
  for (const key of keys) {
    if (source[key]) target[key] = source[key];
  }
}

/** Corps de la requête : les IDs listés si le scope les désigne, sinon les filtres. */
function buildBatchPayload(
  updateConfirmation: UpdateConfirmation,
  affectedProjectIds: string[]
): Record<string, unknown> {
  const { filters, updateData, scopeSource, requestId, confirmationId, expectedUpdatedAtById } =
    updateConfirmation;
  const payload: Record<string, unknown> = {};

  // Ajouter requestId si présent
  if (requestId) {
    payload.requestId = requestId;
  }

  // Ajouter confirmationId pour l'idempotency (obligatoire)
  if (confirmationId) {
    payload.confirmationId = confirmationId;
  }

  // Si scope = LastListedIds, utiliser les IDs au lieu des filtres
  if (scopeSource === 'LastListedIds' && affectedProjectIds.length > 0) {
    payload.projectIds = affectedProjectIds;
    payload.scopeSource = 'LastListedIds';
    // Ajouter expectedUpdatedAtById pour vérification concurrency optimiste
    if (expectedUpdatedAtById && Object.keys(expectedUpdatedAtById).length > 0) {
      payload.expectedUpdatedAtById = expectedUpdatedAtById;
    }
  } else {
    // Sinon, utiliser les filtres (comportement existant)
    copyDefined(payload, filters, ['minProgress', 'maxProgress', 'hasDeadline']);
    copyTruthy(payload, filters, [
      'status',
      'noProgress',
      'collab',
      'style',
      'label',
      'labelFinal',
    ]);
  }

  // Add new values
  copyDefined(payload, updateData, ['newProgress', 'newDeadline']);
  copyTruthy(payload, updateData, [
    'newStatus',
    'pushDeadlineBy',
    'newCollab',
    'newStyle',
    'newLabel',
    'newLabelFinal',
  ]);

  return payload;
}

/** Des projets ont changé depuis la confirmation : on le dit, sans mise à jour optimiste. */
async function reportConflict(
  response: Response,
  { idx, setMessages, setIsLoading }: HandleConfirmUpdateParams
) {
  const errorData = await response.json();
  // Les détails sont dans errorData.details (format ApiErrorResponse)
  const conflictCount = (errorData.details?.conflictCount as number) || 0;
  const conflictProjectIds = (errorData.details?.conflictProjectIds as string[]) || [];

  // Message clair pour l'utilisateur
  const examples =
    conflictProjectIds.length > 0 ? ` (ex: ${conflictProjectIds.slice(0, 3).join(', ')})` : '';
  const debugDetails =
    isAssistantDebugEnabled() && conflictCount > 0
      ? `\n\n[DEBUG] ${conflictCount} projet(s) en conflit` + examples
      : '';
  const conflictMessage =
    'Certains projets ont été modifiés entre temps. Reliste les projets et recommence.' +
    debugDetails;

  setMessages((prev) =>
    prev.map((m, i) =>
      i === idx
        ? {
            ...m,
            content: `${m.content}\n\n⚠️ ${conflictMessage}`,
            updateConfirmation: undefined, // Retirer la confirmation
          }
        : m
    )
  );

  setIsLoading(false);
}

function describeUpdateCount(apiUpdatedCount: number, expectedCount: number): string {
  if (apiUpdatedCount <= 0) return "Aucun projet n'a été modifié.";
  return apiUpdatedCount !== expectedCount
    ? `✅ ${apiUpdatedCount} projet(s) modifié(s) avec succès ! (${expectedCount} détecté(s), ${apiUpdatedCount} modifié(s))`
    : `✅ ${apiUpdatedCount} projet(s) modifié(s) avec succès !`;
}

/** Filtres encore valables après la modification, ou null s'il n'en reste aucun. */
function nextLastFilters(filters: QueryFilters, updateData: UpdateData): QueryFilters | null {
  const newLastFilters: QueryFilters = {};
  if (updateData.newStatus) {
    newLastFilters.status = updateData.newStatus;
  } else if (filters.status) {
    newLastFilters.status = filters.status;
  }
  if (filters.minProgress !== undefined && updateData.newProgress === undefined) {
    newLastFilters.minProgress = filters.minProgress;
  }
  if (filters.maxProgress !== undefined && updateData.newProgress === undefined) {
    newLastFilters.maxProgress = filters.maxProgress;
  }
  if (filters.collab && !updateData.newCollab) newLastFilters.collab = filters.collab;
  if (filters.style && !updateData.newStyle) newLastFilters.style = filters.style;

  return Object.keys(newLastFilters).length > 0 ? newLastFilters : null;
}

export async function handleConfirmUpdate(params: HandleConfirmUpdateParams): Promise<void> {
  const {
    msg,
    idx,
    router,
    setIsLoading,
    setMessages,
    setLocalProjects,
    localProjectsRef,
    setLastFilters,
  } = params;
  setIsLoading(true);
  try {
    const { filters, updateData } = msg.updateConfirmation!;

    // Special case: add note to specific project
    if (updateData.projectName && updateData.newNote) {
      await addNoteToProject(params);
      return;
    }

    // Normal case: batch update
    const updateConfirmation = msg.updateConfirmation!;
    const affectedProjectIds =
      updateConfirmation.affectedProjectIds || updateConfirmation.affectedProjects.map((p) => p.id);
    const detectedCount = affectedProjectIds.length;
    const requestId = updateConfirmation.requestId;
    const logPrefix = requestId ? `[${requestId}]` : '';

    const payload = buildBatchPayload(updateConfirmation, affectedProjectIds);

    const response = await fetch('/api/projects/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Gérer le cas 409 Conflict (concurrency)
    if (response.status === 409) {
      await reportConflict(response, params);
      return; // Ne pas appliquer de mise à jour locale optimiste
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la modification');
    }

    const result = await response.json();
    const apiUpdatedCount = result.data?.count || 0;
    const expectedCount = detectedCount;

    // Logs après réponse API
    const mismatch = apiUpdatedCount !== expectedCount;
    debugLogObject('handleConfirmUpdate', `${logPrefix} 📥 Après réponse API`, {
      requestId,
      detectedCount: expectedCount,
      apiUpdatedCount,
      mismatch,
      mismatchDetails: mismatch
        ? {
            expected: expectedCount,
            actual: apiUpdatedCount,
            difference: apiUpdatedCount - expectedCount,
          }
        : undefined,
    });

    // Afficher un warning visible en UI si mismatch (dev only)
    if (mismatch && isAssistantDebugEnabled()) {
      logger.error(
        `[handleConfirmUpdate] ⚠️ MISMATCH DÉTECTÉ: ${expectedCount} projets détectés, ${apiUpdatedCount} projets modifiés par l'API`
      );
      // Ajouter un warning dans le message
      const warningMessage = `⚠️ [DEBUG] Mismatch détecté: ${expectedCount} détectés, ${apiUpdatedCount} modifiés`;
      logger.error(warningMessage);
    }

    let successMessage = describeUpdateCount(apiUpdatedCount, expectedCount);

    // Si mismatch, ajouter un avertissement visible
    if (mismatch && isAssistantDebugEnabled()) {
      successMessage += `\n\n⚠️ [DEBUG] Mismatch: ${expectedCount} détectés, ${apiUpdatedCount} modifiés`;
    }

    // Update lastFilters
    setLastFilters(nextLastFilters(filters, updateData));

    // Calculate updated projects for display
    const updatedProjects = calculateUpdatedProjects(
      msg.updateConfirmation!.affectedProjects,
      localProjectsRef.current,
      updateData
    );

    // Update local projects state
    setLocalProjects((prevProjects) => {
      const updatedProjectsMap = new Map(updatedProjects.map((up) => [up.id, up]));
      const affectedProjectIds = new Set(msg.updateConfirmation!.affectedProjects.map((p) => p.id));

      const newProjects = prevProjects.map((project) => {
        const updatedProject = updatedProjectsMap.get(project.id);
        if (updatedProject) return updatedProject;

        if (affectedProjectIds.has(project.id)) {
          return applyUpdatesToProject(project, updateData);
        }
        return project;
      });

      localProjectsRef.current = newProjects as Project[];
      return newProjects as Project[];
    });

    // Update message with success
    // Utiliser les fieldsToShow du routeur si disponibles, sinon par défaut
    const fieldsToShow = msg.updateConfirmation?.fieldsToShow || [
      'status',
      'progress',
      'collab',
      'releaseDate',
      'deadline',
      'style',
    ];

    setMessages((prev) =>
      prev.map((m, i) =>
        i === idx
          ? {
              ...m,
              content: successMessage,
              data: {
                projects: updatedProjects as Project[],
                type: 'update',
                fieldsToShow,
              },
              updateConfirmation: undefined,
            }
          : m
      )
    );

    // Dispatch event
    const projectIds = msg.updateConfirmation!.affectedProjects.map((p) => p.id);
    window.dispatchEvent(
      new CustomEvent('projectsUpdatedFromAssistant', {
        detail: {
          projectIds,
          updates: {
            progress: updateData.newProgress,
            status: updateData.newStatus,
            deadline: updateData.newDeadline,
            pushDeadlineBy: updateData.pushDeadlineBy,
            collab: updateData.newCollab,
            style: updateData.newStyle,
            label: updateData.newLabel,
            labelFinal: updateData.newLabelFinal,
          },
        },
      })
    );

    router.refresh();
  } catch (error) {
    const errorMessage = `❌ Erreur : ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, content: `${m.content}\n\n${errorMessage}` } : m))
    );
  } finally {
    setIsLoading(false);
  }
}

export function handleCancelUpdate(
  idx: number,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
): void {
  setMessages((prev) =>
    prev.map((m, i) =>
      i === idx
        ? {
            ...m,
            content: `${m.content}\n\n❌ Modification annulée.`,
            updateConfirmation: undefined,
          }
        : m
    )
  );
}

// Helper to calculate updated projects with new dates/values
function calculateUpdatedProjects(
  affectedProjects: Project[],
  localProjectsRef: Project[],
  updateData: UpdateData
): Project[] {
  return affectedProjects.map((p) => {
    const currentProject = localProjectsRef.find((lp) => lp.id === p.id) || p;
    return applyUpdatesToProject(currentProject, updateData);
  });
}

// Apply updates to a single project
function applyUpdatesToProject(project: Project, updateData: UpdateData): Project {
  let newDeadline = project.deadline;

  if (updateData.pushDeadlineBy && project.deadline) {
    const updatedDeadline = new Date(project.deadline);
    if (updateData.pushDeadlineBy.days !== undefined) {
      updatedDeadline.setDate(updatedDeadline.getDate() + updateData.pushDeadlineBy.days);
    }
    if (updateData.pushDeadlineBy.weeks !== undefined) {
      updatedDeadline.setDate(updatedDeadline.getDate() + updateData.pushDeadlineBy.weeks * 7);
    }
    if (updateData.pushDeadlineBy.months !== undefined) {
      updatedDeadline.setMonth(updatedDeadline.getMonth() + updateData.pushDeadlineBy.months);
    }
    newDeadline = updatedDeadline.toISOString().split('T')[0];
  } else if (updateData.newDeadline !== undefined) {
    newDeadline = updateData.newDeadline || null;
  }

  return {
    ...project,
    progress: updateData.newProgress !== undefined ? updateData.newProgress : project.progress,
    status: (updateData.newStatus || project.status) as Project['status'],
    deadline: newDeadline,
    collab: updateData.newCollab || project.collab,
    style: updateData.newStyle || project.style,
    label: updateData.newLabel || project.label,
    labelFinal: updateData.newLabelFinal || project.labelFinal,
  };
}
