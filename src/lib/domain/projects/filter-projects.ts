/**
 * Project filtering logic
 *
 * Filters projects according to query filter criteria.
 * This is the canonical source for project filtering logic.
 */
import type { Project } from './types';
import type { QueryFilters } from './filters';
import { logger } from '@/lib/logger';

export interface FilterResult {
  filtered: Project[];
  nullProgressCount: number;
  hasProgressFilter: boolean;
}

// Projets SANS progression renseignée (exclusif - ignore les autres filtres de progression)
function filterNoProgress(project: Project): boolean {
  // Vérifier que le projet n'a pas de progression renseignée
  const hasNoProgress = project.progress === null || project.progress === undefined;
  // Si on cherche des projets sans avancement, on retourne directement le résultat
  // (les autres filtres comme statut, collab, etc. sont déjà vérifiés avant)
  if (!hasNoProgress) {
    logger.warn(
      '[Filter Projects] ❌ Projet exclu (a une progression):',
      project.name,
      project.progress
    );
  }
  return hasNoProgress;
}

// Filtre de progression sur une valeur renseignée (min/max stricts, ou exact si min === max)
function matchesProgressRange(progress: number, filters: QueryFilters): boolean {
  // Cas spécial : filtre exact (minProgress === maxProgress)
  if (
    filters.minProgress !== undefined &&
    filters.maxProgress !== undefined &&
    filters.minProgress === filters.maxProgress
  ) {
    // Filtre exact : le projet doit avoir exactement cette valeur
    return progress === filters.minProgress;
  }
  // Filtre par progression min (strictement supérieur)
  if (filters.minProgress !== undefined && progress <= filters.minProgress) {
    return false;
  }
  // Filtre par progression max (strictement inférieur)
  if (filters.maxProgress !== undefined && progress >= filters.maxProgress) {
    return false;
  }
  return true;
}

// Recherche insensible à la casse ; une valeur absente ne correspond à aucune recherche
function matchesSubstring(value: string | null | undefined, search: string): boolean {
  return (value ?? '').toLowerCase().includes(search.toLowerCase());
}

export function filterProjects(projects: Project[], filters: QueryFilters): FilterResult {
  const hasProgressFilter = filters.minProgress !== undefined || filters.maxProgress !== undefined;
  let nullProgressCount = 0;

  const filtered = projects.filter((project) => {
    // Filtre par statut
    if (filters.status && project.status !== filters.status) {
      return false;
    }

    if (filters.noProgress) {
      return filterNoProgress(project);
    }

    // Filtre par progression - exclure les null si on filtre par progression
    if (hasProgressFilter) {
      if (project.progress === null || project.progress === undefined) {
        nullProgressCount++;
        return false; // Exclure les projets sans progression renseignée
      }
      if (!matchesProgressRange(project.progress, filters)) {
        return false;
      }
    }

    // Filtres textuels : collaborateur, style, nom
    const textFilters: Array<[string | undefined, string | null | undefined]> = [
      [filters.collab, project.collab],
      [filters.style, project.style],
      [filters.name, project.name],
    ];
    if (textFilters.some(([search, value]) => search && !matchesSubstring(value, search))) {
      return false;
    }

    // Filtre par deadline
    if (filters.hasDeadline !== undefined && filters.hasDeadline !== !!project.deadline) {
      return false;
    }

    return true;
  });

  return { filtered, nullProgressCount, hasProgressFilter };
}
