/**
 * Handler pour les intentions "en détail"
 */

import type { Project } from '@/lib/domain/projects';
import {
  ProjectCommandType,
  type ProjectFilter,
  type RouterContext,
  type DetailIntentResult,
  DETAILED_FIELDS_TO_SHOW,
} from './types';
import { isAssistantDebugEnabled } from '../../utils/debug';
import { applyProjectFilterAndSort, isFilterEmpty } from '../filter-helpers';
import { logger } from '@/lib/logger';

type DetailScopeSource = 'LastListedIds' | 'LastAppliedFilter' | 'scope_missing';

/** Trace le scope utilisé pour l'intention « en détail » (mode debug uniquement). */
function logDetailScope(
  scopeSource: DetailScopeSource,
  listedCount: number,
  requestId: string | undefined
): void {
  if (isAssistantDebugEnabled()) {
    logger.warn('[Router] 🔎 DetailIntent', {
      scopeSource,
      listedCount,
      requestId,
    });
  }
}

/** Résultat « liste détaillée » pour les projets du scope trouvé. */
function buildDetailedListResult(
  scopedProjects: Project[],
  effectiveFilter: ProjectFilter,
  requestId: string | undefined,
  emptyMessage: string
): DetailIntentResult {
  const count = scopedProjects.length;
  const message = count === 0 ? emptyMessage : `J'ai trouvé ${count} projet(s) en détail.`;

  return {
    handled: true,
    result: {
      type: ProjectCommandType.LIST,
      projects: scopedProjects,
      count,
      fieldsToShow: [...DETAILED_FIELDS_TO_SHOW],
      message,
      appliedFilter: effectiveFilter,
      listedProjectIds: scopedProjects.map((p) => p.id),
      displayMode: 'detailed',
      requestId,
    },
  };
}

/**
 * Gère l'intention "en détail" pour relister le dernier scope en mode détaillé
 */
export function handleDetailIntent(
  lowerQuery: string,
  projects: Project[],
  context: RouterContext,
  requestId?: string
): DetailIntentResult {
  // Détecter une intention "en détail" pour relister le dernier scope en mode détaillé
  const detailIntentPattern =
    /^(en\s+d[ée]tail|en\s+details?|d[ée]tails?|plus\s+de\s+d[ée]tails?|affiche\s+(en\s+)?d[ée]tail|affiche\s+le\s+d[ée]tail)\s*[?]?$/i;
  const isDetailIntent = detailIntentPattern.test(lowerQuery.trim());

  if (!isDetailIntent) {
    return { handled: false };
  }

  const { lastListedProjectIds, lastAppliedFilter } = context;

  // Priorité 1 : Utiliser les IDs du dernier listing
  if (lastListedProjectIds && lastListedProjectIds.length > 0) {
    const scopedProjects = projects.filter((p) => lastListedProjectIds.includes(p.id));
    logDetailScope('LastListedIds', scopedProjects.length, requestId);
    return buildDetailedListResult(
      scopedProjects,
      {}, // Pas de filtre, on utilise les IDs
      requestId,
      "Je n'ai trouvé aucun projet correspondant au dernier listing."
    );
  }

  // Priorité 2 : Utiliser le dernier filtre appliqué
  if (lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
    const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
    logDetailScope('LastAppliedFilter', filtered.length, requestId);
    return buildDetailedListResult(
      filtered,
      lastAppliedFilter,
      requestId,
      "Je n'ai trouvé aucun projet correspondant au dernier filtre."
    );
  }

  // Pas de scope récent : demander clarification
  logDetailScope('scope_missing', 0, requestId);
  return {
    handled: true,
    result: {
      type: ProjectCommandType.GENERAL,
      response:
        "Je n'ai pas de scope récent (aucun projet listé précédemment). Pouvez-vous d'abord lister des projets ? (ex: 'liste les en cours')",
      requestId,
    },
  };
}
