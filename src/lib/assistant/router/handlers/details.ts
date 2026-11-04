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
  let scopeSource: 'LastListedIds' | 'LastAppliedFilter' | 'scope_missing';
  let scopedProjects: Project[];
  let effectiveFilter: ProjectFilter;

  if (lastListedProjectIds && lastListedProjectIds.length > 0) {
    // Priorité 1 : Utiliser les IDs du dernier listing
    scopeSource = 'LastListedIds';
    scopedProjects = projects.filter((p) => lastListedProjectIds.includes(p.id));
    effectiveFilter = {}; // Pas de filtre, on utilise les IDs

    if (isAssistantDebugEnabled()) {
      logger.warn('[Router] 🔎 DetailIntent', {
        scopeSource,
        listedCount: scopedProjects.length,
        requestId,
      });
    }

    const count = scopedProjects.length;
    const message =
      count === 0
        ? "Je n'ai trouvé aucun projet correspondant au dernier listing."
        : `J'ai trouvé ${count} projet(s) en détail.`;

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
  } else if (lastAppliedFilter && !isFilterEmpty(lastAppliedFilter)) {
    // Priorité 2 : Utiliser le dernier filtre appliqué
    scopeSource = 'LastAppliedFilter';
    const { filtered } = applyProjectFilterAndSort(projects, lastAppliedFilter);
    scopedProjects = filtered;
    effectiveFilter = lastAppliedFilter;

    if (isAssistantDebugEnabled()) {
      logger.warn('[Router] 🔎 DetailIntent', {
        scopeSource,
        listedCount: scopedProjects.length,
        requestId,
      });
    }

    const count = scopedProjects.length;
    const message =
      count === 0
        ? "Je n'ai trouvé aucun projet correspondant au dernier filtre."
        : `J'ai trouvé ${count} projet(s) en détail.`;

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
  } else {
    // Pas de scope récent : demander clarification
    if (isAssistantDebugEnabled()) {
      logger.warn('[Router] 🔎 DetailIntent', {
        scopeSource: 'scope_missing',
        listedCount: 0,
        requestId,
      });
    }

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
}
