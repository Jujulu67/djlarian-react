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

/** Date au format court français (JJ/MM/AA) */
function formatShortDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

/** Libellé de la deadline avant/après un décalage par unités (jours, semaines, mois, années) */
function formatDeadlineShiftChange(
  deadline: NonNullable<Project['deadline']>,
  pushDeadlineBy: NonNullable<ProjectMutation['pushDeadlineBy']>
): string {
  const beforeDate = new Date(deadline);
  const afterDate = new Date(beforeDate);
  if (pushDeadlineBy.days) {
    afterDate.setDate(afterDate.getDate() + pushDeadlineBy.days);
  }
  if (pushDeadlineBy.weeks) {
    afterDate.setDate(afterDate.getDate() + pushDeadlineBy.weeks * 7);
  }
  if (pushDeadlineBy.months) {
    afterDate.setMonth(afterDate.getMonth() + pushDeadlineBy.months);
  }
  if (pushDeadlineBy.years) {
    afterDate.setFullYear(afterDate.getFullYear() + pushDeadlineBy.years);
  }
  return `deadline ${formatShortDate(beforeDate)} → ${formatShortDate(afterDate)}`;
}

/** Libellé de la deadline quand on la remplace par une nouvelle valeur */
function formatDeadlineReplaceChange(
  project: Project,
  newDeadline: ProjectMutation['newDeadline']
): string {
  const before = project.deadline ? formatShortDate(new Date(project.deadline)) : '-';
  const after = newDeadline ? formatShortDate(new Date(newDeadline)) : '-';
  return `deadline ${before} → ${after}`;
}

/** Libellé de la note ajoutée (tronquée à 30 caractères) */
function formatNoteChange(newNote: string): string {
  return `note + "${newNote.substring(0, 30)}${newNote.length > 30 ? '...' : ''}"`;
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
    changes.push(formatDeadlineShiftChange(project.deadline, mutation.pushDeadlineBy));
  } else if (mutation.newDeadline !== undefined) {
    changes.push(formatDeadlineReplaceChange(project, mutation.newDeadline));
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
    changes.push(formatNoteChange(mutation.newNote));
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
