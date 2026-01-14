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

/**
 * Génère un ID unique pour une action en attente
 */
export function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    changes.push(`progress ${before !== null ? `${before}%` : '-'} → ${after}%`);
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

  // Type UPDATE
  const changes: string[] = [];

  // Gestion spéciale pour pushDeadlineBy (décalage de deadline)
  if (mutation.pushDeadlineBy) {
    const delta = mutation.pushDeadlineBy;
    const parts: string[] = [];
    if (delta.days) {
      parts.push(`${delta.days > 0 ? '+' : ''}${delta.days} jour${delta.days !== 1 ? 's' : ''}`);
    }
    if (delta.weeks) {
      parts.push(
        `${delta.weeks > 0 ? '+' : ''}${delta.weeks} semaine${delta.weeks !== 1 ? 's' : ''}`
      );
    }
    if (delta.months) {
      parts.push(`${delta.months > 0 ? '+' : ''}${delta.months} mois`);
    }
    if (delta.years) {
      parts.push(`${delta.years > 0 ? '+' : ''}${delta.years} an${delta.years !== 1 ? 's' : ''}`);
    }
    if (parts.length > 0) {
      changes.push(`Décaler la deadline de ${parts.join(', ')}`);
    } else {
      changes.push('Décaler la deadline');
    }
  } else {
    // Autres mutations
    if (mutation.newStatus) changes.push(`statut → ${mutation.newStatus}`);
    if (mutation.newDeadline) changes.push(`deadline → ${mutation.newDeadline}`);
    if (mutation.newProgress !== undefined) changes.push(`progression → ${mutation.newProgress}%`);
    if (mutation.newCollab) changes.push(`collab → ${mutation.newCollab}`);
    if (mutation.newStyle) changes.push(`style → ${mutation.newStyle}`);
  }

  let description = `Modifier ${affectedCount} projet(s)`;
  if (changes.length > 0) {
    description += ` : ${changes.join(', ')}`;
  }

  if (skippedCount && skippedCount > 0) {
    description += ` (${skippedCount} projet(s) ignoré(s) - pas de deadline)`;
  }

  return description;
}
