/**
 * Project filtering logic
 *
 * Filters projects according to query filter criteria.
 * This is the canonical source for project filtering logic.
 */
import type { Project } from './types';
import type { QueryFilters } from './filters';

export interface FilterResult {
  filtered: Project[];
  nullProgressCount: number;
  hasProgressFilter: boolean;
}

export function filterProjects(projects: Project[], filters: QueryFilters): FilterResult {
  const hasProgressFilter = filters.minProgress !== undefined || filters.maxProgress !== undefined;
  let nullProgressCount = 0;

  const filtered = projects.filter((project) => {
    // Filtre par statut
    if (filters.status && project.status !== filters.status) {
      return false;
    }

    // Filtre spécial : projets SANS progression renseignée (exclusif - ignore les autres filtres de progression)
    if (filters.noProgress) {
      // Vérifier que le projet n'a pas de progression renseignée
      const hasNoProgress = project.progress === null || project.progress === undefined;
      // Si on cherche des projets sans avancement, on retourne directement le résultat
      // (les autres filtres comme statut, collab, etc. sont déjà vérifiés avant)
      if (!hasNoProgress) {
        console.warn(
          '[Filter Projects] ❌ Projet exclu (a une progression):',
          project.name,
          project.progress
        );
      }
      return hasNoProgress;
    }

    // Filtre par progression - exclure les null si on filtre par progression
    if (hasProgressFilter) {
      if (project.progress === null || project.progress === undefined) {
        nullProgressCount++;
        return false; // Exclure les projets sans progression renseignée
      }

      // Cas spécial : filtre exact (minProgress === maxProgress)
      if (
        filters.minProgress !== undefined &&
        filters.maxProgress !== undefined &&
        filters.minProgress === filters.maxProgress
      ) {
        // Filtre exact : le projet doit avoir exactement cette valeur
        if (project.progress !== filters.minProgress) {
          return false;
        }
      } else {
        // Filtre par progression min (strictement supérieur)
        if (filters.minProgress !== undefined && project.progress <= filters.minProgress) {
          return false;
        }

        // Filtre par progression max (strictement inférieur)
        if (filters.maxProgress !== undefined && project.progress >= filters.maxProgress) {
          return false;
        }
      }
    }

    // Filtre par collaborateur
    if (filters.collab) {
      if (!project.collab || !project.collab.toLowerCase().includes(filters.collab.toLowerCase())) {
        return false;
      }
    }

    // Filtre par style
    if (filters.style) {
      if (!project.style || !project.style.toLowerCase().includes(filters.style.toLowerCase())) {
        return false;
      }
    }

    // Filtre par nom
    if (filters.name) {
      if (!project.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
    }

    // Filtre par deadline
    if (filters.hasDeadline !== undefined) {
      const hasDeadline = !!project.deadline;
      if (filters.hasDeadline !== hasDeadline) {
        return false;
      }
    }

    return true;
  });

  return { filtered, nullProgressCount, hasProgressFilter };
}
