'use client';

/**
 * Handler for update confirmation logic
 * Handles both note addition and bulk batch updates
 */
import type { Project } from '@/components/projects/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { Message, QueryFilters, UpdateData } from '../types';
import { debugLogObject, isAssistantDebugEnabled } from '@/lib/assistant/utils/debug';

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

export async function handleConfirmUpdate({
  msg,
  idx,
  router,
  setIsLoading,
  setMessages,
  setLocalProjects,
  localProjectsRef,
  setLastFilters,
}: HandleConfirmUpdateParams): Promise<void> {
  setIsLoading(true);
  try {
    const { filters, updateData } = msg.updateConfirmation!;

    // Special case: add note to specific project
    if (updateData.projectName && updateData.newNote) {
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
        window.dispatchEvent(
          new CustomEvent('projectsUpdatedFromAssistant', {
            detail: { projectIds: [projectId], updates: { note: true } },
          })
        );
      }

      setTimeout(() => router.refresh(), 500);

      // Mark message as processed
      setMessages((prev) =>
        prev.map((m) => (m === msg ? { ...m, updateConfirmation: undefined } : m))
      );
      setIsLoading(false);
      return;
    }

    // Normal case: batch update
    const updateConfirmation = msg.updateConfirmation!;
    const scopeSource = updateConfirmation.scopeSource;
    const affectedProjectIds =
      updateConfirmation.affectedProjectIds || updateConfirmation.affectedProjects.map((p) => p.id);
    const detectedCount = affectedProjectIds.length;
    const requestId = updateConfirmation.requestId;
    const confirmationId = updateConfirmation.confirmationId;

    // Logs avant appel API
    const hasFilterInPayload = Object.keys(filters).some(
      (key) =>
        filters[key as keyof QueryFilters] !== undefined &&
        filters[key as keyof QueryFilters] !== null
    );

    const logPrefix = requestId ? `[${requestId}]` : '';
    debugLogObject('handleConfirmUpdate', `${logPrefix} 📤 Avant appel API`, {
      requestId,
      scopeSource: scopeSource || 'unknown',
      affectedProjectIdsCount: detectedCount,
      affectedProjectIdsSample: affectedProjectIds.slice(0, 3),
      payloadSummary: {
        progress: updateData.newProgress,
        status: updateData.newStatus,
        deadline: updateData.newDeadline,
        note: updateData.newNote ? 'present' : undefined,
      },
      hasFilterInPayload,
    });

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
      debugLogObject('handleConfirmUpdate', `${logPrefix} 🎯 Utilisation des IDs (LastListedIds)`, {
        requestId,
        projectIdsCount: affectedProjectIds.length,
        projectIdsSample: affectedProjectIds.slice(0, 3),
      });
    } else {
      // Sinon, utiliser les filtres (comportement existant)
      // Add filters
      if (filters.minProgress !== undefined) payload.minProgress = filters.minProgress;
      if (filters.maxProgress !== undefined) payload.maxProgress = filters.maxProgress;
      if (filters.status) payload.status = filters.status;
      if (filters.hasDeadline !== undefined) payload.hasDeadline = filters.hasDeadline;
      if (filters.noProgress) payload.noProgress = true;
      if (filters.collab) payload.collab = filters.collab;
      if (filters.style) payload.style = filters.style;
      if (filters.label) payload.label = filters.label;
      if (filters.labelFinal) payload.labelFinal = filters.labelFinal;
    }

    // Add new values
    if (updateData.newProgress !== undefined) payload.newProgress = updateData.newProgress;
    if (updateData.newStatus) payload.newStatus = updateData.newStatus;
    if (updateData.newDeadline !== undefined) payload.newDeadline = updateData.newDeadline;
    if (updateData.pushDeadlineBy) payload.pushDeadlineBy = updateData.pushDeadlineBy;
    if (updateData.newCollab) payload.newCollab = updateData.newCollab;
    if (updateData.newStyle) payload.newStyle = updateData.newStyle;
    if (updateData.newLabel) payload.newLabel = updateData.newLabel;
    if (updateData.newLabelFinal) payload.newLabelFinal = updateData.newLabelFinal;

    const response = await fetch('/api/projects/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
      console.error(
        `[handleConfirmUpdate] ⚠️ MISMATCH DÉTECTÉ: ${expectedCount} projets détectés, ${apiUpdatedCount} projets modifiés par l'API`
      );
      // Ajouter un warning dans le message
      const warningMessage = `⚠️ [DEBUG] Mismatch détecté: ${expectedCount} détectés, ${apiUpdatedCount} modifiés`;
      console.error(warningMessage);
    }

    let successMessage =
      apiUpdatedCount > 0
        ? apiUpdatedCount !== expectedCount
          ? `✅ ${apiUpdatedCount} projet(s) modifié(s) avec succès ! (${expectedCount} détecté(s), ${apiUpdatedCount} modifié(s))`
          : `✅ ${apiUpdatedCount} projet(s) modifié(s) avec succès !`
        : "Aucun projet n'a été modifié.";

    // Si mismatch, ajouter un avertissement visible
    if (mismatch && isAssistantDebugEnabled()) {
      successMessage += `\n\n⚠️ [DEBUG] Mismatch: ${expectedCount} détectés, ${apiUpdatedCount} modifiés`;
    }

    // Update lastFilters
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

    setLastFilters(Object.keys(newLastFilters).length > 0 ? newLastFilters : null);

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

    setTimeout(() => router.refresh(), 500);
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
