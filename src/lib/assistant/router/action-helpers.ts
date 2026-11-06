/**
 * Helpers pour les actions projets
 *
 * Ce module regroupe les fonctions utilitaires pour :
 * - Générer des IDs uniques pour les actions en attente
 * - Générer des diffs avant→après pour la prévisualisation
 * - Construire des descriptions lisibles des actions
 */

import type { Project } from '@/lib/domain/projects';
import { ProjectCommandType, type ProjectMutation, type ProjectPreviewDiff } from './types';
import { randomToken } from '@/lib/utils/random';

/**
 * Génère un ID unique pour une action en attente
 */
export function generateActionId(): string {
  return `action_${Date.now()}_${randomToken(9)}`;
}

/**
 * Génère un diff avant→après pour un projet
 */
export function generateProjectPreviewDiff(
  project: Project,
  mutation: ProjectMutation
): ProjectPreviewDiff {
  const changes: string[] = [];

  // Progress
  if (mutation.newProgress !== undefined) {
    const before = project.progress ?? null;
    const after = mutation.newProgress;
    const beforeLabel = before === null ? '-' : `${before}%`;
    changes.push(`progress ${beforeLabel} → ${after}%`);
  }

  // Status
  if (mutation.newStatus) {
    const before = project.status || '-';
    const after = mutation.newStatus;
    changes.push(`status ${before} → ${after}`);
  }

  // Deadline
  if (mutation.pushDeadlineBy && project.deadline) {
    const beforeDate = new Date(project.deadline);
    const afterDate = new Date(beforeDate);
    if (mutation.pushDeadlineBy.days) {
      afterDate.setDate(afterDate.getDate() + mutation.pushDeadlineBy.days);
    }
    if (mutation.pushDeadlineBy.weeks) {
      afterDate.setDate(afterDate.getDate() + mutation.pushDeadlineBy.weeks * 7);
    }
    if (mutation.pushDeadlineBy.months) {
      afterDate.setMonth(afterDate.getMonth() + mutation.pushDeadlineBy.months);
    }
    if (mutation.pushDeadlineBy.years) {
      afterDate.setFullYear(afterDate.getFullYear() + mutation.pushDeadlineBy.years);
    }
    const beforeStr = beforeDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
    const afterStr = afterDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
    changes.push(`deadline ${beforeStr} → ${afterStr}`);
  } else if (mutation.newDeadline !== undefined) {
    const before = project.deadline
      ? new Date(project.deadline).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
      : '-';
    const after = mutation.newDeadline
      ? new Date(mutation.newDeadline).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
      : '-';
    changes.push(`deadline ${before} → ${after}`);
  }

  // Label
  if (mutation.newLabel !== undefined) {
    const before = project.label || '-';
    const after = mutation.newLabel || '-';
    changes.push(`label ${before} → ${after}`);
  }

  // LabelFinal
  if (mutation.newLabelFinal !== undefined) {
    const before = project.labelFinal || '-';
    const after = mutation.newLabelFinal || '-';
    changes.push(`labelFinal ${before} → ${after}`);
  }

  // Note (ajout)
  if (mutation.newNote) {
    changes.push(
      `note + "${mutation.newNote.substring(0, 30)}${mutation.newNote.length > 30 ? '...' : ''}"`
    );
  }

  return {
    id: project.id,
    name: project.name,
    changes,
  };
}

/** « +2 semaines », « -1 semaine », ou null si la valeur est nulle. */
function formatShift(value: number | undefined, unit: string, plural = 's'): string | null {
  if (!value) return null;
  return `${value > 0 ? '+' : ''}${value} ${unit}${value !== 1 ? plural : ''}`;
}

function describeDeadlineShift(delta: NonNullable<ProjectMutation['pushDeadlineBy']>): string {
  const parts = [
    formatShift(delta.days, 'jour'),
    formatShift(delta.weeks, 'semaine'),
    formatShift(delta.months, 'mois', ''),
    formatShift(delta.years, 'an'),
  ].filter(Boolean);
  return parts.length > 0 ? `Décaler la deadline de ${parts.join(', ')}` : 'Décaler la deadline';
}

function describeFieldChanges(mutation: ProjectMutation): string[] {
  const changes: string[] = [];
  if (mutation.newStatus) changes.push(`statut → ${mutation.newStatus}`);
  if (mutation.newDeadline) changes.push(`deadline → ${mutation.newDeadline}`);
  if (mutation.newProgress !== undefined) changes.push(`progression → ${mutation.newProgress}%`);
  if (mutation.newCollab) changes.push(`collab → ${mutation.newCollab}`);
  if (mutation.newStyle) changes.push(`style → ${mutation.newStyle}`);
  return changes;
}

/**
 * Construit une description lisible de l'action
 */
export function buildActionDescription(
  type: ProjectCommandType.UPDATE | ProjectCommandType.ADD_NOTE,
  mutation: ProjectMutation,
  affectedCount: number,
  skippedCount?: number
): string {
  if (type === ProjectCommandType.ADD_NOTE) {
    if (mutation.projectName) {
      return `Ajouter une note au projet "${mutation.projectName}"`;
    }
    return `Ajouter une note à ${affectedCount} projet(s)`;
  }

  const changes = mutation.pushDeadlineBy
    ? [describeDeadlineShift(mutation.pushDeadlineBy)]
    : describeFieldChanges(mutation);

  let description = `Modifier ${affectedCount} projet(s)`;
  if (changes.length > 0) {
    description += ` : ${changes.join(', ')}`;
  }

  if (skippedCount && skippedCount > 0) {
    description += ` (${skippedCount} projet(s) ignoré(s) - pas de deadline)`;
  }

  return description;
}
