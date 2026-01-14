/**
 * Handler pour le listing des projets
 */

import type { Project, QueryFilters } from '@/lib/domain/projects';
import {
  ProjectCommandType,
  type ProjectCommandResult,
  type ProjectFilter,
  type RouterContext,
  DETAILED_FIELDS_TO_SHOW,
} from './types';
import { debugLog } from '../../utils/debug';
import { applyProjectFilterAndSort, isFilterEmpty, summarizeFilter } from '../filter-helpers';

/**
 * Gère le listing des projets
 */
export function handleListCommand(
  classification: { isList: boolean; isCount: boolean },
  filters: QueryFilters,
  projects: Project[],
  context: RouterContext,
  fieldsToShow?: string[],
  requestId?: string,
  isDetailsViewRequested: boolean = false,
  isAllProjectsRequested: boolean = false
): ProjectCommandResult {
  console.warn('[Router] 📋 Routing vers Listing (côté client)');

  // Détecter si un filtre explicite est présent
  const hasExplicitFilter = !isFilterEmpty(filters);

  let scopeSource: 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter';
  let scopedProjects: Project[];
  let effectiveFilter: ProjectFilter;

  if (!hasExplicitFilter && !isAllProjectsRequested) {
    const { lastAppliedFilter } = context;

    if (isDetailsViewRequested && lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
      // Cas spécial : "voir les détails" sans préciser de filtre, mais on en a un en mémoire
      // On réapplique le dernier filtre
      console.warn('[Router] 📋 LIST sans filtre explicite (vue détails) → scope = last filter');
      scopeSource = 'LastAppliedFilter';
      const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
      scopedProjects = filtered;
      effectiveFilter = lastAppliedFilter;
    } else {
      // Fallback : tous les projets (pas de working set disponible)
      console.warn(
        '[Router] 📋 LIST sans filtre explicite et sans historique → scope = tous les projets'
      );
      scopeSource = 'AllProjects';
      scopedProjects = projects;
      effectiveFilter = {};
    }
  } else if (hasExplicitFilter || isAllProjectsRequested) {
    // Filtre explicite présent OU demande explicite de "tous les projets" : utiliser le filtre
    console.warn(
      `[Router] 📋 LIST avec ${hasExplicitFilter ? 'filtre explicite' : 'demande tous les projets'} → scope = filtre de la commande`
    );
    scopeSource = 'ExplicitFilter';
    effectiveFilter = {
      ...filters,
      // TODO: Détecter sortBy et sortDirection depuis la requête si nécessaire
    };
    const { filtered } = applyProjectFilterAndSort(projects, effectiveFilter);
    scopedProjects = filtered;
  } else {
    // Comportement par défaut : utiliser le filtre (même s'il est vide)
    scopeSource = 'ExplicitFilter';
    effectiveFilter = {
      ...filters,
    };
    const { filtered } = applyProjectFilterAndSort(projects, effectiveFilter);
    scopedProjects = filtered;
  }

  // Si c'est une vue détails, forcer fieldsToShow à "all" (liste complète standardisée)
  const finalFieldsToShow =
    isDetailsViewRequested && !isAllProjectsRequested
      ? [...DETAILED_FIELDS_TO_SHOW]
      : fieldsToShow && fieldsToShow.length > 0
        ? fieldsToShow
        : ['progress', 'status', 'deadline'];

  const count = scopedProjects.length;

  // Logs du scope choisi (debug)
  debugLog('router', '🎯 LIST Scope choisi', {
    scopeSource,
    scopeCount: count,
    effectiveFilter: summarizeFilter(effectiveFilter),
    lastListedProjectIdsCount: context.lastListedProjectIds?.length || 0,
    lastAppliedFilterSummary: summarizeFilter(context.lastAppliedFilter),
    isDetailsViewRequested,
    isAllProjectsRequested,
    hasExplicitFilter,
  });

  const message =
    classification.isCount && !classification.isList
      ? `Vous avez ${count} projet(s).`
      : count === 0
        ? "Je n'ai trouvé aucun projet correspondant."
        : `J'ai trouvé ${count} projet(s).`;

  return {
    type: ProjectCommandType.LIST,
    projects: scopedProjects,
    count,
    fieldsToShow: finalFieldsToShow,
    message,
    appliedFilter: effectiveFilter,
    listedProjectIds: scopedProjects.map((p) => p.id),
    requestId,
  };
}
