/**
 * Helpers pour les filtres de projets
 *
 * Ce module regroupe les fonctions utilitaires pour :
 * - Appliquer des filtres et tris sur les projets
 * - Calculer les projets affectés par des mutations
 * - Vérifier si un filtre est vide ou scoping
 * - Résumer les filtres pour les logs
 */

import type { Project, QueryFilters } from '@/lib/domain/projects';
import { filterProjects } from '@/lib/domain/projects';
import type { ProjectFilter } from './types';

/**
 * Applique les filtres et le tri sur les projets en mémoire (0 DB)
 */
export function applyProjectFilterAndSort(
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
export function calculateAffectedProjects(projects: Project[], filters: QueryFilters): Project[] {
  const filterResult = filterProjects(projects, filters);
  return filterResult.filtered;
}

/**
 * Vérifie si un filtre est vide ou non significatif (aucun critère de filtrage réel)
 * Gère les cas : undefined, null, chaînes vides, tableaux vides
 */
export function isFilterEmpty(filter: QueryFilters | ProjectFilter | undefined | null): boolean {
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
 * Vérifie si un filtre est un filtre scoping (qui restreint réellement un subset métier)
 *
 * Un filtre scoping est un filtre qui restreint un subset métier (ex: status, collab, style, etc.)
 *
 * Retourne false si :
 * - Le filtre est vide
 * - Le filtre contient uniquement hasDeadline (qui peut être un qualifier de mutation, pas un filtre scoping)
 * - Le filtre contient uniquement des "qualifiers techniques" non scoping
 *
 * Retourne true si le filtre contient au moins un critère scoping réel (status, collab, style, label, progress, etc.)
 */
export function isScopingFilter(filter: QueryFilters | ProjectFilter | undefined | null): boolean {
  if (!filter) {
    return false;
  }

  // Vérifier chaque propriété scoping
  const hasStatus = filter.status !== undefined && filter.status !== null && filter.status !== '';
  const hasMinProgress = filter.minProgress !== undefined && filter.minProgress !== null;
  const hasMaxProgress = filter.maxProgress !== undefined && filter.maxProgress !== null;
  const hasCollab = filter.collab !== undefined && filter.collab !== null && filter.collab !== '';
  const hasStyle = filter.style !== undefined && filter.style !== null && filter.style !== '';
  const hasLabel = filter.label !== undefined && filter.label !== null && filter.label !== '';
  const hasLabelFinal =
    'labelFinal' in filter &&
    filter.labelFinal !== undefined &&
    filter.labelFinal !== null &&
    filter.labelFinal !== '';
  const hasName = filter.name !== undefined && filter.name !== null && filter.name !== '';
  const hasNoProgress = filter.noProgress !== undefined && filter.noProgress !== null;
  const hasYear = 'year' in filter && filter.year !== undefined && filter.year !== null;
  const hasDeadline = filter.hasDeadline !== undefined && filter.hasDeadline !== null;

  // Si on a au moins un critère scoping réel (autre que hasDeadline), c'est un filtre scoping
  const hasScopingCriteria =
    hasStatus ||
    hasMinProgress ||
    hasMaxProgress ||
    hasCollab ||
    hasStyle ||
    hasLabel ||
    hasLabelFinal ||
    hasName ||
    hasNoProgress ||
    hasYear;

  // Si on a au moins un critère scoping, c'est un filtre scoping
  if (hasScopingCriteria) {
    return true;
  }

  // Si on a uniquement hasDeadline dans les filters, c'est un filtre scoping explicite
  // (car si hasDeadline est dans filters, c'est que l'utilisateur l'a explicitement demandé,
  // contrairement à hasDeadline dans updateData qui peut être juste une conséquence de la mutation)
  if (hasDeadline) {
    return true;
  }

  // Sinon, pas de filtre scoping
  return false;
}

/**
 * Résume un filtre pour les logs (affiche seulement les propriétés non vides)
 */
export function summarizeFilter(
  filter: QueryFilters | ProjectFilter | undefined | null
): Record<string, unknown> {
  if (!filter) {
    return { empty: true };
  }

  const summary: Record<string, unknown> = {};
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
