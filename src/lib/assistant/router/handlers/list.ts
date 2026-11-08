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
import { logger } from '@/lib/logger';

/**
 * Détermine le périmètre (scope) des projets listés
 */
function resolveListScope(
  filters: QueryFilters,
  projects: Project[],
  context: RouterContext,
  hasExplicitFilter: boolean,
  isDetailsViewRequested: boolean,
  isAllProjectsRequested: boolean
): {
  scopeSource: 'LastAppliedFilter' | 'AllProjects' | 'ExplicitFilter';
  scopedProjects: Project[];
  effectiveFilter: ProjectFilter;
} {
  if (hasExplicitFilter || isAllProjectsRequested) {
    // Filtre explicite présent OU demande explicite de "tous les projets" : utiliser le filtre
    logger.warn(
      `[Router] 📋 LIST avec ${hasExplicitFilter ? 'filtre explicite' : 'demande tous les projets'} → scope = filtre de la commande`
    );
    const effectiveFilter: ProjectFilter = {
      ...filters,
    };
    const { filtered } = applyProjectFilterAndSort(projects, effectiveFilter);
    return { scopeSource: 'ExplicitFilter', scopedProjects: filtered, effectiveFilter };
  }

  const { lastAppliedFilter } = context;

  if (isDetailsViewRequested && lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
    // Cas spécial : "voir les détails" sans préciser de filtre, mais on en a un en mémoire
    // On réapplique le dernier filtre
    logger.warn('[Router] 📋 LIST sans filtre explicite (vue détails) → scope = last filter');
    const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
    return {
      scopeSource: 'LastAppliedFilter',
      scopedProjects: filtered,
      effectiveFilter: lastAppliedFilter,
    };
  }

  // Fallback : tous les projets (pas de working set disponible)
  logger.warn(
    '[Router] 📋 LIST sans filtre explicite et sans historique → scope = tous les projets'
  );
  return { scopeSource: 'AllProjects', scopedProjects: projects, effectiveFilter: {} };
}

/**
 * Champs affichés dans la liste (vue détails forcée à la liste standardisée)
 */
function resolveFinalFieldsToShow(
  fieldsToShow: string[] | undefined,
  isDetailsViewRequested: boolean,
  isAllProjectsRequested: boolean
): string[] {
  if (isDetailsViewRequested && !isAllProjectsRequested) {
    return [...DETAILED_FIELDS_TO_SHOW];
  }
  if (fieldsToShow && fieldsToShow.length > 0) {
    return fieldsToShow;
  }
  return ['progress', 'status', 'deadline'];
}

/**
 * Message de réponse du listing
 */
function buildListMessage(isCountOnly: boolean, count: number): string {
  if (isCountOnly) return `Vous avez ${count} projet(s).`;
  if (count === 0) return "Je n'ai trouvé aucun projet correspondant.";
  return `J'ai trouvé ${count} projet(s).`;
}

/**
 * Gère le listing des projets
 */
export function handleListCommand(
  classification: { isList: boolean; isCount: boolean },
  filters: QueryFilters,
  projects: Project[],
  context: RouterContext,
  options: {
    fieldsToShow?: string[];
    requestId?: string;
    isDetailsViewRequested?: boolean;
    isAllProjectsRequested?: boolean;
  } = {}
): ProjectCommandResult {
  const {
    fieldsToShow,
    requestId,
    isDetailsViewRequested = false,
    isAllProjectsRequested = false,
  } = options;
  logger.warn('[Router] 📋 Routing vers Listing (côté client)');

  // Détecter si un filtre explicite est présent
  const hasExplicitFilter = !isFilterEmpty(filters);

  const { scopeSource, scopedProjects, effectiveFilter } = resolveListScope(
    filters,
    projects,
    context,
    hasExplicitFilter,
    isDetailsViewRequested,
    isAllProjectsRequested
  );

  // Si c'est une vue détails, forcer fieldsToShow à "all" (liste complète standardisée)
  const finalFieldsToShow = resolveFinalFieldsToShow(
    fieldsToShow,
    isDetailsViewRequested,
    isAllProjectsRequested
  );

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

  const message = buildListMessage(classification.isCount && !classification.isList, count);

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
